import 'server-only';

import pdf from 'pdf-parse';

import { env } from './env';

const minExcerptLength = 80;
const maxExcerptLength = 900;
const maxExcerptCount = 3;

const cachedReferenceText = new Map<string, Promise<string | null>>();
const parsePdfBuffer = pdf as unknown as (buffer: Buffer) => Promise<{ text?: string }>;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function tokenize(value: string): string[] {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9åäö\s-]/gi, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

export function toReferencePdfDownloadUrl(url: string): string {
  const trimmedUrl = url.trim();
  const driveMatch = trimmedUrl.match(/drive\.google\.com\/file\/d\/([^/]+)\//i);

  if (!driveMatch) {
    return trimmedUrl;
  }

  return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
}

function splitIntoCandidateExcerpts(value: string): string[] {
  const paragraphs = value
    .split(/\n\s*\n/g)
    .map((paragraph) => normalizeWhitespace(paragraph))
    .filter((paragraph) => paragraph.length >= minExcerptLength);

  if (paragraphs.length > 0) {
    return paragraphs.map((paragraph) => paragraph.slice(0, maxExcerptLength));
  }

  const normalized = normalizeWhitespace(value);
  const chunks: string[] = [];

  for (let start = 0; start < normalized.length; start += maxExcerptLength) {
    const chunk = normalized.slice(start, start + maxExcerptLength).trim();

    if (chunk.length >= minExcerptLength) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

function scoreExcerpt(excerpt: string, queryTokens: Set<string>): number {
  if (queryTokens.size === 0) {
    return 0;
  }

  const excerptTokens = new Set(tokenize(excerpt));
  let overlapCount = 0;

  for (const token of queryTokens) {
    if (excerptTokens.has(token)) {
      overlapCount += 1;
    }
  }

  return overlapCount;
}

export function selectReferenceExcerpts(referenceText: string, sourceText: string): string[] {
  const excerpts = splitIntoCandidateExcerpts(referenceText);

  if (excerpts.length === 0) {
    return [];
  }

  const queryTokens = new Set(tokenize(sourceText));
  const rankedExcerpts = excerpts
    .map((excerpt, index) => ({
      excerpt,
      index,
      score: scoreExcerpt(excerpt, queryTokens),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.index - right.index;
    });

  const selected = rankedExcerpts
    .filter((excerpt) => excerpt.score > 0)
    .slice(0, maxExcerptCount)
    .map((excerpt) => excerpt.excerpt);

  if (selected.length > 0) {
    return selected;
  }

  return excerpts.slice(0, maxExcerptCount);
}

async function fetchReferencePdfText(url: string): Promise<string | null> {
  const response = await fetch(toReferencePdfDownloadUrl(url), {
    cache: 'force-cache',
  });

  if (!response.ok) {
    throw new Error(`Reference PDF request failed with status ${response.status}.`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const parsed = await parsePdfBuffer(buffer);
  const text = parsed.text ? normalizeWhitespace(parsed.text) : '';

  return text.length > 0 ? text : null;
}

function getCachedReferencePdfText(url: string): Promise<string | null> {
  const cached = cachedReferenceText.get(url);

  if (cached) {
    return cached;
  }

  const promise = fetchReferencePdfText(url).catch((error: unknown) => {
    console.error('[reference-material] failed to load remote PDF reference', {
      url,
      error: error instanceof Error ? error.message : String(error),
    });

    return null;
  });

  cachedReferenceText.set(url, promise);

  return promise;
}

function buildExcerptSection(title: string, excerpts: string[]): string {
  if (excerpts.length === 0) {
    return '';
  }

  return [title, ...excerpts.map((excerpt, index) => `${index + 1}. ${excerpt}`)].join('\n');
}

export async function buildRuntimeReferencePromptContext(sourceText: string): Promise<string> {
  const sections: string[] = [];

  if (env.REFERENCE_SOURCE_PDF_URL) {
    const sourcePdfText = await getCachedReferencePdfText(env.REFERENCE_SOURCE_PDF_URL);
    const excerpts = sourcePdfText ? selectReferenceExcerpts(sourcePdfText, sourceText) : [];
    const section = buildExcerptSection('Runtime Swedish reference excerpts:', excerpts);

    if (section.length > 0) {
      sections.push(section);
    }
  }

  if (env.REFERENCE_DRAFT_PDF_URL) {
    const draftPdfText = await getCachedReferencePdfText(env.REFERENCE_DRAFT_PDF_URL);
    const excerpts = draftPdfText ? selectReferenceExcerpts(draftPdfText, sourceText) : [];
    const section = buildExcerptSection('Runtime English draft reference excerpts:', excerpts);

    if (section.length > 0) {
      sections.push(section);
    }
  }

  return sections.join('\n\n');
}
