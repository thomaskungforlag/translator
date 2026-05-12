#!/usr/bin/env node
/* global __filename, console, process */

const { execSync } = require('node:child_process');
const { existsSync, readFileSync, writeFileSync } = require('node:fs');
const { dirname, join, resolve } = require('node:path');

/*
Unified release bump script.
Usage:
  node scripts/release-bump.cjs patch
  node scripts/release-bump.cjs minor
  node scripts/release-bump.cjs major

Behavior:
  - Ensures a clean working tree
  - Bumps the root npm version without creating npm's own commit/tag
  - Regenerates the root CHANGELOG.md
  - Syncs the WordPress plugin header version
  - Commits and tags the release
  - Leaves pushing & GitHub release to the caller
*/

const scriptDir = dirname(__filename);
const repoRoot = resolve(scriptDir, '..');
const rootPackageJson = join(repoRoot, 'package.json');
const rootPackageLockJson = join(repoRoot, 'package-lock.json');
const rootChangelogMd = join(repoRoot, 'CHANGELOG.md');
const pluginEntryFile = join(
  repoRoot,
  'packages',
  'wordpress-plugin',
  'thomas-kung-polylang-translator.php',
);

function run(cmd, inherit = true) {
  return execSync(cmd, {
    cwd: repoRoot,
    stdio: inherit ? 'inherit' : 'pipe',
  });
}

function get(cmd) {
  return execSync(cmd, { cwd: repoRoot, stdio: 'pipe' }).toString().trim();
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writePhpVersion(path, version) {
  const content = readFileSync(path, 'utf8');
  const updated = content.replace(
    /^(\s*\*\s*Version:\s*)(.+)$/m,
    (_, prefix) => `${prefix}${version}`,
  );

  if (updated === content) {
    throw new Error(`Could not update a Version header in ${path}`);
  }

  writeFileSync(path, updated);
}

function syncPluginVersion(version) {
  if (!existsSync(pluginEntryFile)) {
    return false;
  }

  const pluginFile = readFileSync(pluginEntryFile, 'utf8');
  const versionMatch = pluginFile.match(/^\s*\*\s*Version:\s*(.+)$/m);

  if (!versionMatch?.[1]) {
    throw new Error(`Could not find a Version header in ${pluginEntryFile}`);
  }

  const currentVersion = versionMatch[1].trim();
  if (currentVersion === version) {
    return false;
  }

  writePhpVersion(pluginEntryFile, version);
  return true;
}

function formatGeneratedChangelog() {
  if (!existsSync(rootChangelogMd)) {
    return;
  }

  run(`npx prettier --write "${rootChangelogMd}"`);
}

const type = process.argv[2];
if (!['patch', 'minor', 'major'].includes(type)) {
  console.error('Usage: release-bump.cjs <patch|minor|major>');
  process.exit(1);
}

const status = get('git status --porcelain');
if (status) {
  console.error('✖ Working tree not clean. Commit or stash changes first.');
  process.exit(1);
}

console.log(`🔢 Bumping ${type} version...`);
run(`npm version ${type} --no-git-tag-version`);

const newVersion = readJson(rootPackageJson).version;

console.log('📝 Generating changelog...');
run('npm run changelog:generate');
formatGeneratedChangelog();

if (!existsSync(rootChangelogMd)) {
  console.warn('⚠️ CHANGELOG.md missing after generation; verify conventional-changelog setup.');
}

const pluginVersionUpdated = syncPluginVersion(newVersion);

console.log('📦 Staging artifacts...');
const filesToStage = [rootPackageJson, rootPackageLockJson, rootChangelogMd];
if (pluginVersionUpdated) {
  filesToStage.push(pluginEntryFile);
}
run(`git add ${filesToStage.map((file) => `"${file}"`).join(' ')}`);

const commitMsg = `chore(release): ${newVersion}`;
console.log(`✅ Committing: ${commitMsg}`);
run(`git commit -m "${commitMsg}"`);

const tag = `v${newVersion}`;
console.log(`🏷  Tagging: ${tag}`);
run(`git tag -a "${tag}" -m "${tag}"`);

console.log('\nPush tags and commits to remote repository:');
run('git push && git push --tags');
console.log('  (Optional) Create GitHub Release from tag.');
