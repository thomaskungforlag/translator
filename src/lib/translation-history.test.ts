import { buildDefaultStyleProfile, buildStudioShellProject } from './pipeline';
import { getTargetLanguageConfig } from './workspace-options';
import {
  loadTranslationHistoryEntries,
  loadTranslationHistoryEntry,
  restoreTranslationHistoryEntry,
  saveTranslationHistoryEntry,
} from './translation-history';

function buildProjectFixture(title: string) {
  return buildStudioShellProject({
    projectId: `project-${title.toLowerCase().replace(/\s+/g, '-')}`,
    title,
    contentType: 'novel_chapter',
    sourceLanguageCode: 'sv',
    targetLanguage: getTargetLanguageConfig('en'),
    styleProfile: buildDefaultStyleProfile(),
    sourceText: 'Första stycket.\n\nAndra stycket.',
    glossary: [],
    segmentationStrategy: 'paragraph',
  });
}

describe('translation history cache', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saves the newest translation first and reloads the full entry', () => {
    const project = buildProjectFixture('Demo translation');

    const summaries = saveTranslationHistoryEntry(
      {
        sourceLanguageCode: 'sv',
        sourceText: 'Första stycket.\n\nAndra stycket.',
        segmentationStrategy: 'paragraph',
        project,
        provider: 'openai',
        model: 'gpt-5-mini',
        mode: 'openai',
        message: 'Translation completed with OpenAI.',
        warnings: ['Recovered one segment locally.'],
      },
      {
        id: 'history-entry-1',
        createdAt: '2026-05-21T10:00:00.000Z',
        updatedAt: '2026-05-21T10:00:00.000Z',
      },
    );

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      id: 'history-entry-1',
      title: 'Demo translation',
      route: '/translate',
      sourceLanguageCode: 'sv',
      provider: 'openai',
      model: 'gpt-5-mini',
      mode: 'openai',
      warningCount: 1,
    });

    const entries = loadTranslationHistoryEntries();

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: 'history-entry-1',
      title: 'Demo translation',
    });

    const fullEntry = loadTranslationHistoryEntry('history-entry-1');

    expect(fullEntry).not.toBeNull();
    expect(fullEntry).toMatchObject({
      id: 'history-entry-1',
      route: '/translate',
      title: 'Demo translation',
      sourceText: 'Första stycket.\n\nAndra stycket.',
      provider: 'openai',
      model: 'gpt-5-mini',
      warnings: ['Recovered one segment locally.'],
    });

    const restored = restoreTranslationHistoryEntry(fullEntry as NonNullable<typeof fullEntry>);

    expect(restored).toMatchObject({
      sourceText: 'Första stycket.\n\nAndra stycket.',
      provider: 'openai',
      model: 'gpt-5-mini',
      warnings: ['Recovered one segment locally.'],
    });
  });

  it('keeps only the newest entries when the cache limit is reached', () => {
    const firstProject = buildProjectFixture('First translation');
    const secondProject = buildProjectFixture('Second translation');
    const thirdProject = buildProjectFixture('Third translation');

    saveTranslationHistoryEntry(
      {
        sourceLanguageCode: 'sv',
        sourceText: 'Första stycket.',
        segmentationStrategy: 'paragraph',
        project: firstProject,
        provider: 'openai',
        model: 'gpt-5-mini',
        mode: 'openai',
        warnings: [],
      },
      { id: 'history-entry-1', createdAt: '2026-05-21T10:00:00.000Z' },
    );

    saveTranslationHistoryEntry(
      {
        sourceLanguageCode: 'sv',
        sourceText: 'Andra stycket.',
        segmentationStrategy: 'paragraph',
        project: secondProject,
        provider: 'openai',
        model: 'gpt-5-mini',
        mode: 'openai',
        warnings: [],
      },
      { id: 'history-entry-2', createdAt: '2026-05-21T11:00:00.000Z' },
    );

    saveTranslationHistoryEntry(
      {
        sourceLanguageCode: 'sv',
        sourceText: 'Tredje stycket.',
        segmentationStrategy: 'paragraph',
        project: thirdProject,
        provider: 'openai',
        model: 'gpt-5-mini',
        mode: 'openai',
        warnings: [],
      },
      {
        id: 'history-entry-3',
        createdAt: '2026-05-21T12:00:00.000Z',
        maxEntries: 2,
      },
    );

    expect(loadTranslationHistoryEntries().map((entry) => entry.id)).toEqual([
      'history-entry-3',
      'history-entry-2',
    ]);
    expect(loadTranslationHistoryEntry('history-entry-1')).toBeNull();
    expect(loadTranslationHistoryEntry('history-entry-2')).not.toBeNull();
    expect(loadTranslationHistoryEntry('history-entry-3')).not.toBeNull();
  });
});
