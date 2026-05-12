import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const pluginSourceDir = join(repoRoot, 'packages', 'wordpress-plugin');
const pluginEntryFile = join(pluginSourceDir, 'thomas-kung-polylang-translator.php');
const pluginReadmeFile = join(pluginSourceDir, 'README.md');
const pluginSlug = basename(pluginEntryFile, '.php');
const distDir = join(repoRoot, 'dist', 'wordpress-plugin');
const tempDir = join(repoRoot, '.tmp', 'wordpress-plugin-package');
const tempPluginDir = join(tempDir, pluginSlug);
const pluginArtifactPattern = new RegExp(`^${pluginSlug}-.*\\.(zip|sha256)$`);

function requireFile(path) {
  if (!existsSync(path)) {
    throw new Error(`Required file not found: ${path}`);
  }
}

function readPluginVersion() {
  const pluginFile = readFileSync(pluginEntryFile, 'utf8');
  const versionMatch = pluginFile.match(/^\s*\*\s*Version:\s*(.+)$/m);

  if (!versionMatch?.[1]) {
    throw new Error(`Could not find a Version header in ${pluginEntryFile}`);
  }

  return versionMatch[1].trim();
}

function ensureZipAvailable() {
  try {
    execFileSync('zip', ['-v'], { stdio: 'ignore' });
  } catch {
    throw new Error('The `zip` command is required to package the WordPress plugin.');
  }
}

function stagePluginFiles() {
  rmSync(tempDir, { recursive: true, force: true });
  mkdirSync(tempPluginDir, { recursive: true });
  cpSync(join(pluginSourceDir, 'includes'), join(tempPluginDir, 'includes'), { recursive: true });
  copyFileSync(pluginEntryFile, join(tempPluginDir, basename(pluginEntryFile)));
  copyFileSync(pluginReadmeFile, join(tempPluginDir, 'README.md'));
}

function buildZip(version) {
  mkdirSync(distDir, { recursive: true });
  const zipBaseName = `${pluginSlug}-${version}`;
  const zipPath = join(distDir, `${zipBaseName}.zip`);
  const checksumPath = join(distDir, `${zipBaseName}.sha256`);

  rmSync(zipPath, { force: true });
  rmSync(checksumPath, { force: true });

  execFileSync('zip', ['-r', zipPath, pluginSlug], {
    cwd: tempDir,
    stdio: 'inherit',
  });

  const zipBuffer = readFileSync(zipPath);
  const sha256 = createHash('sha256').update(zipBuffer).digest('hex');
  writeFileSync(checksumPath, `${sha256}  ${basename(zipPath)}\n`, 'utf8');

  return { zipPath, checksumPath };
}

function cleanExistingArtifacts() {
  if (!existsSync(distDir)) {
    return;
  }

  for (const entry of readdirSync(distDir)) {
    if (pluginArtifactPattern.test(entry)) {
      rmSync(join(distDir, entry), { force: true });
    }
  }
}

function main() {
  requireFile(pluginEntryFile);
  requireFile(pluginReadmeFile);
  ensureZipAvailable();

  const version = readPluginVersion();
  cleanExistingArtifacts();
  stagePluginFiles();
  const { zipPath, checksumPath } = buildZip(version);

  console.log(`Packaged WordPress plugin ${pluginSlug} v${version}`);
  console.log(`ZIP: ${zipPath}`);
  console.log(`SHA256: ${checksumPath}`);
}

main();
