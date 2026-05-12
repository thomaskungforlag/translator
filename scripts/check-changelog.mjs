#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = pkg.version;
let md;
try {
  md = readFileSync('CHANGELOG.md', 'utf8');
} catch {
  console.error('❌ CHANGELOG.md missing');
  process.exit(1);
}
const headingPattern = new RegExp(`^## \\[${version.replace(/\./g, '\\.')}\\]`, 'm');
if (!headingPattern.test(md)) {
  console.error(`❌ Changelog missing section for version ${version}`);
  process.exit(1);
}
console.log(`✅ Changelog contains section for ${version}`);
