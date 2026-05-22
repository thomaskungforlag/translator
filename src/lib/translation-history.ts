import type { ContentType, LanguageCode } from './domain';
import type { ModelProvider } from './model-options';
import type { StudioShellProject, SegmentationStrategy } from './workspace';

export type TranslationHistoryMode = 'openai' | 'poe' | 'fallback';

export type TranslationHistoryEntryInput = {
  sourceLanguageCode: LanguageCode;
  sourceText: string;
  segmentationStrategy: SegmentationStrategy;
  project: StudioShellProject;
  provider: ModelProvider;
  model: string;
  mode: TranslationHistoryMode;
  message?: string;
  warnings: string[];
};

export type TranslationHistoryEntry = TranslationHistoryEntryInput & {
  id: string;
  route: '/translate';
  createdAt: string;
  updatedAt: string;
  title: string;
  preview: string;
};

export type TranslationHistorySummary = Pick<
  TranslationHistoryEntry,
  | 'id'
  | 'route'
  | 'title'
  | 'createdAt'
  | 'updatedAt'
  | 'preview'
  | 'sourceLanguageCode'
  | 'segmentationStrategy'
  | 'provider'
  | 'model'
  | 'mode'
> & {
  contentType: ContentType;
  targetLanguageLabel: string;
  warningCount: number;
};

type HistoryIndexRecord = {
  entries: TranslationHistorySummary[];
};

const translationHistoryIndexKey = 'translator.translation-history.v1.index';
const translationHistoryEntryKeyPrefix = 'translator.translation-history.v1.entry';
const defaultHistoryLimit = 50;

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function getEntryKey(id: string): string {
  return `${translationHistoryEntryKeyPrefix}.${id}`;
}

function removeEntry(id: string): void {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.removeItem(getEntryKey(id));
}

function toIsoTimestamp(value: number | Date = Date.now()): string {
  return typeof value === 'number' ? new Date(value).toISOString() : value.toISOString();
}

function buildPreview(project: StudioShellProject, sourceText: string): string {
  const finalText = project.segments
    .map((segment) => segment.finalText?.trim())
    .filter((text): text is string => Boolean(text))
    .join('\n\n');

  const rawPreview = finalText.trim().length > 0 ? finalText : sourceText;
  const normalized = rawPreview.replace(/\s+/g, ' ').trim();

  if (normalized.length <= 220) {
    return normalized;
  }

  return `${normalized.slice(0, 220).trimEnd()}…`;
}

function buildHistorySummary(entry: TranslationHistoryEntry): TranslationHistorySummary {
  return {
    id: entry.id,
    route: entry.route,
    title: entry.title,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    preview: entry.preview,
    sourceLanguageCode: entry.sourceLanguageCode,
    segmentationStrategy: entry.segmentationStrategy,
    provider: entry.provider,
    model: entry.model,
    mode: entry.mode,
    contentType: entry.project.contentType,
    targetLanguageLabel: entry.project.targetLanguage.label,
    warningCount: entry.warnings.length,
  };
}

function readHistoryIndex(): HistoryIndexRecord {
  if (!canUseLocalStorage()) {
    return { entries: [] };
  }

  try {
    const raw = window.localStorage.getItem(translationHistoryIndexKey);

    if (!raw) {
      return { entries: [] };
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== 'object') {
      return { entries: [] };
    }

    const record = parsed as Partial<HistoryIndexRecord>;

    if (!Array.isArray(record.entries)) {
      return { entries: [] };
    }

    return {
      entries: record.entries.filter((entry): entry is TranslationHistorySummary => {
        return Boolean(
          entry &&
          typeof entry.id === 'string' &&
          typeof entry.route === 'string' &&
          typeof entry.title === 'string' &&
          typeof entry.createdAt === 'string' &&
          typeof entry.updatedAt === 'string' &&
          typeof entry.preview === 'string' &&
          typeof entry.sourceLanguageCode === 'string' &&
          typeof entry.segmentationStrategy === 'string' &&
          typeof entry.provider === 'string' &&
          typeof entry.model === 'string' &&
          typeof entry.mode === 'string' &&
          typeof entry.contentType === 'string' &&
          typeof entry.targetLanguageLabel === 'string' &&
          typeof entry.warningCount === 'number',
        );
      }),
    };
  } catch {
    return { entries: [] };
  }
}

function writeHistoryIndex(entries: TranslationHistorySummary[]): void {
  window.localStorage.setItem(
    translationHistoryIndexKey,
    JSON.stringify({
      entries,
    }),
  );
}

function writeEntry(entry: TranslationHistoryEntry): void {
  window.localStorage.setItem(getEntryKey(entry.id), JSON.stringify(entry));
}

function hasHistoryEntryMetadata(record: Partial<TranslationHistoryEntry>): boolean {
  return (
    typeof record.id === 'string' &&
    typeof record.route === 'string' &&
    typeof record.createdAt === 'string' &&
    typeof record.updatedAt === 'string' &&
    typeof record.title === 'string' &&
    typeof record.preview === 'string' &&
    typeof record.sourceLanguageCode === 'string' &&
    typeof record.sourceText === 'string' &&
    typeof record.segmentationStrategy === 'string' &&
    typeof record.provider === 'string' &&
    typeof record.model === 'string' &&
    typeof record.mode === 'string' &&
    Array.isArray(record.warnings)
  );
}

function hasHistoryEntryProject(record: Partial<TranslationHistoryEntry>): boolean {
  return Boolean(record.project && typeof record.project === 'object');
}

function isTranslationHistoryEntryRecord(
  record: Partial<TranslationHistoryEntry>,
): record is TranslationHistoryEntry {
  return hasHistoryEntryMetadata(record) && hasHistoryEntryProject(record);
}

export function buildTranslationHistoryEntry(
  input: TranslationHistoryEntryInput,
  options?: {
    id?: string;
    createdAt?: string;
    updatedAt?: string;
  },
): TranslationHistoryEntry {
  const now = toIsoTimestamp();
  const id =
    options?.id ??
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `hist-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);

  return {
    ...input,
    id,
    route: '/translate',
    createdAt: options?.createdAt ?? now,
    updatedAt: options?.updatedAt ?? now,
    title: input.project.title,
    preview: buildPreview(input.project, input.sourceText),
  };
}

export function loadTranslationHistoryEntries(): TranslationHistorySummary[] {
  return readHistoryIndex().entries;
}

export function loadTranslationHistoryEntry(id: string): TranslationHistoryEntry | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getEntryKey(id));

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const record = parsed as Partial<TranslationHistoryEntry>;

    if (!isTranslationHistoryEntryRecord(record)) {
      return null;
    }

    return record;
  } catch {
    return null;
  }
}

export function saveTranslationHistoryEntry(
  input: TranslationHistoryEntryInput,
  options?: {
    id?: string;
    createdAt?: string;
    updatedAt?: string;
    maxEntries?: number;
  },
): TranslationHistorySummary[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const record = buildTranslationHistoryEntry(input, options);
    const nextSummary = buildHistorySummary(record);
    const maxEntries = options?.maxEntries ?? defaultHistoryLimit;
    const currentEntries = readHistoryIndex().entries.filter((entry) => entry.id !== record.id);
    const nextEntries = [nextSummary, ...currentEntries].slice(0, maxEntries);
    const retainedIds = new Set(nextEntries.map((entry) => entry.id));

    writeEntry(record);
    writeHistoryIndex(nextEntries);

    currentEntries.forEach((entry) => {
      if (!retainedIds.has(entry.id)) {
        removeEntry(entry.id);
      }
    });

    return nextEntries;
  } catch {
    return readHistoryIndex().entries;
  }
}

export function restoreTranslationHistoryEntry(
  entry: TranslationHistoryEntry,
): Omit<TranslationHistoryEntry, 'id' | 'route' | 'createdAt' | 'updatedAt' | 'title' | 'preview'> {
  return {
    sourceLanguageCode: entry.sourceLanguageCode,
    sourceText: entry.sourceText,
    segmentationStrategy: entry.segmentationStrategy,
    project: entry.project,
    provider: entry.provider,
    model: entry.model,
    mode: entry.mode,
    message: entry.message,
    warnings: entry.warnings,
  };
}
