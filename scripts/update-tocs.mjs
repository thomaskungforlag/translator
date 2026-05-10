#!/usr/bin/env node
import { promises as fs } from 'fs';
import { join, resolve, extname } from 'path';

// --- README TOC logic ---
const README_PATH = join(process.cwd(), 'README.md');
const START_MARKER = '<!-- TOC-START -->';
const END_MARKER = '<!-- TOC-END -->';

function slugify(raw) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[`*_~]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function extractHeadings(lines, minLevel = 2, maxLevel = 3, skipRanges = []) {
  const headings = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (skipRanges.some(([start, end]) => i >= start && i <= end)) continue;
    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = line.match(/^(#{2,6}) (.+)$/);
    if (!m) continue;
    const level = m[1].length;
    if (level < minLevel || level > maxLevel) continue;
    const text = m[2].trim();
    if (
      text.toLowerCase() === 'table of contents' ||
      text === 'Quick Links' ||
      text.startsWith('Example')
    )
      continue;
    headings.push({ level, text, slug: slugify(text), index: i });
  }
  return headings;
}

async function updateReadmeToc() {
  let content = await fs.readFile(README_PATH, 'utf8');
  // Ensure markers exist
  function ensureMarkers(md) {
    if (md.includes(START_MARKER) && md.includes(END_MARKER)) return md;
    const quickLinksIdx = md.indexOf('## Quick Links');
    if (quickLinksIdx !== -1) {
      const afterHeadingIdx = md.indexOf('\n', quickLinksIdx) + 1;
      let cursor = afterHeadingIdx;
      let inTable = false;
      while (cursor < md.length) {
        const nextNl = md.indexOf('\n', cursor);
        const line = md.slice(cursor, nextNl === -1 ? md.length : nextNl);
        if (line.startsWith('|')) inTable = true;
        else if (inTable && line.trim() === '') {
          const insertionPoint = cursor;
          return (
            md.slice(0, insertionPoint) +
            `\n${START_MARKER}\n${END_MARKER}` +
            md.slice(insertionPoint)
          );
        } else if (inTable && !line.startsWith('|')) {
          const insertionPoint = cursor;
          return (
            md.slice(0, insertionPoint) +
            `\n${START_MARKER}\n${END_MARKER}\n` +
            md.slice(insertionPoint)
          );
        }
        if (nextNl === -1) break;
        cursor = nextNl + 1;
      }
      return md + `\n\n${START_MARKER}\n${END_MARKER}`;
    }
    return `${START_MARKER}\n${END_MARKER}\n\n${md}`;
  }
  content = ensureMarkers(content);
  const startIdx = content.indexOf(START_MARKER);
  const endIdx = content.indexOf(END_MARKER, startIdx + START_MARKER.length);
  if (startIdx === -1 || endIdx === -1) {
    console.error('Could not locate TOC markers');
    return;
  }
  const lines = content.split('\n');
  const startLine = lines.findIndex((line) => line.includes(START_MARKER));
  const endLine = lines.findIndex((line, idx) => idx > startLine && line.includes(END_MARKER));
  const skipRanges = startLine >= 0 && endLine >= startLine ? [[startLine, endLine]] : [];
  const toc = extractHeadings(lines, 2, 3, skipRanges);
  // --- Add links to docs/*.md files ---
  let docLinks = '';
  try {
    const docsDir = join(process.cwd(), 'docs');
    const entries = await fs.readdir(docsDir);
    const docFiles = entries
      .filter((f) => ['.md', '.markdown', '.mdx'].includes(extname(f)))
      .filter((f) => f !== 'pull_request_template.md');
    if (docFiles.length) {
      docLinks = docFiles
        .map((f) => `- [${f.replace(/\.(md|markdown|mdx)$/, '')}](/docs/${f})`)
        .join('\n');
      docLinks = `\n### Documentation\n\n${docLinks}\n`;
    }
  } catch {
    // ignore if docs/ missing
  }
  // --- Heading links ---
  let headingLinks = '';
  if (toc.length) {
    headingLinks = toc
      .map((h) => `${'  '.repeat(h.level - 2)}- [${h.text}](#${h.slug})`)
      .join('\n');
    headingLinks = `\n### Main Sections\n\n${headingLinks}\n`;
  }
  const region = `\n${docLinks}${headingLinks}`;
  const newContent =
    content.slice(0, startIdx + START_MARKER.length) + region + content.slice(endIdx);
  if (newContent !== content) {
    await fs.writeFile(README_PATH, newContent, 'utf8');
    console.log('README TOC updated.');
  } else {
    console.log('README TOC unchanged.');
  }
}

// --- docs/ TOC logic ---
const ROOT = resolve(process.cwd());
const DOCS_DIR = join(ROOT, 'docs');
const TARGET_EXT = ['.md', '.markdown', '.mdx'];
const EXCLUDE = new Set(['pull_request_template.md']);

function extractDocHeadings(lines) {
  const headings = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (/^#{2,6} /.test(line.trim())) {
      const level = line.match(/^#+/)[0].length;
      const text = line.replace(/^#+\s*/, '').trim();
      headings.push({ level, text, index: i });
    }
  }
  return headings;
}

function buildDocToc(headings) {
  const filtered = headings.filter(
    (h) => h.level >= 2 && h.text.toLowerCase() !== 'table of contents',
  );
  const lines = [];
  filtered.forEach((h) => {
    const indent = '  '.repeat(Math.max(0, h.level - 2));
    lines.push(`${indent}- [${h.text}](#${slugify(h.text)})`);
  });
  return lines.join('\n');
}

async function updateDocFile(filePath) {
  const original = await fs.readFile(filePath, 'utf8');
  const lines = original.split(/\r?\n/);
  const headings = extractDocHeadings(lines);
  if (!headings.length) return;
  const tocBody = buildDocToc(headings);
  const tocHeaderIdx = headings.findIndex((h) => h.text.toLowerCase() === 'table of contents');
  if (tocHeaderIdx >= 0) {
    const tocHeading = headings[tocHeaderIdx];
    const nextHeading = headings.find((h, i) => i > tocHeaderIdx && h.level <= tocHeading.level);
    const startLine = tocHeading.index + 1;
    const endLine = nextHeading ? nextHeading.index : lines.length;
    const before = lines.slice(0, startLine);
    const after = lines.slice(endLine);
    const newLines = [...before, '', tocBody, '', ...after];
    await fs.writeFile(filePath, newLines.join('\n'), 'utf8');
    console.log(`Updated TOC: ${filePath}`);
  } else {
    const firstH1 = lines.findIndex((l) => /^#\s+/.test(l));
    if (firstH1 === -1) return;
    const insertion = [
      lines[firstH1],
      '',
      '## Table of Contents',
      '',
      tocBody,
      '',
      ...lines.slice(firstH1 + 1),
    ];
    await fs.writeFile(filePath, insertion.join('\n'), 'utf8');
    console.log(`Inserted TOC: ${filePath}`);
  }
}

async function updateDocsToc() {
  let entries = [];
  try {
    entries = await fs.readdir(DOCS_DIR);
  } catch {
    console.warn('No docs/ directory found, skipping docs TOC.');
    return;
  }
  const targets = entries
    .filter((f) => TARGET_EXT.includes(extname(f)))
    .filter((f) => !EXCLUDE.has(f))
    .map((f) => join(DOCS_DIR, f));
  await Promise.all(targets.map(updateDocFile));
}

// --- Main ---
(async function main() {
  await updateReadmeToc();
  await updateDocsToc();
})();
