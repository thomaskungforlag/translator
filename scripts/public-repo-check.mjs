import { execFileSync } from 'node:child_process';

const bannedExactPaths = new Set([
  'docs/RodTvilling.6x9.Hardcover.pdf',
  'docs/RodTvilling.English.pdf',
  'docs/private-reference-material.md',
]);

const bannedTrackedPrefixes = ['private/'];
const bannedTrackedExtensions = ['.pdf', '.docx', '.epub'];
const allowedTrackedExtensionPaths = new Set(['src/app/icon.svg']);

function readGitLines(args) {
  return execFileSync('git', args, { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function collectProblems() {
  const trackedFiles = readGitLines(['ls-files']);
  const historyFiles = new Set(readGitLines(['log', '--all', '--name-only', '--pretty=format:']));
  const problems = [];

  for (const filePath of trackedFiles) {
    if (bannedExactPaths.has(filePath)) {
      problems.push(`Tracked private file must be removed from HEAD: ${filePath}`);
      continue;
    }

    if (bannedTrackedPrefixes.some((prefix) => filePath.startsWith(prefix))) {
      problems.push(`Tracked file is inside a private-only directory: ${filePath}`);
      continue;
    }

    const hasBannedExtension = bannedTrackedExtensions.some((extension) =>
      filePath.toLowerCase().endsWith(extension),
    );

    if (hasBannedExtension && !allowedTrackedExtensionPaths.has(filePath)) {
      problems.push(`Tracked file uses a protected document extension: ${filePath}`);
    }
  }

  for (const filePath of bannedExactPaths) {
    if (historyFiles.has(filePath)) {
      problems.push(`Git history still contains a private path that must be purged: ${filePath}`);
    }
  }

  return problems;
}

function main() {
  const problems = collectProblems();

  if (problems.length === 0) {
    console.log(
      'Public repo audit passed: no banned tracked files or known private history paths found.',
    );
    return;
  }

  console.error('Public repo audit failed:');

  for (const problem of problems) {
    console.error(`- ${problem}`);
  }

  process.exitCode = 1;
}

main();
