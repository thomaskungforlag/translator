import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { DocumentSegment } from '@/lib/domain';
import { buildDefaultStyleProfile } from '@/lib/pipeline';
import * as translationHistory from '@/lib/translation-history';
import { getTargetLanguageConfig } from '@/lib/workspace-options';
import { TranslationWorkspace } from './translation-workspace';

jest.mock('@/lib/translation-history', () => ({
  loadTranslationHistoryEntries: jest.fn(),
  loadTranslationHistoryEntry: jest.fn(),
  restoreTranslationHistoryEntry: jest.fn(),
  saveTranslationHistoryEntry: jest.fn(),
}));

describe('TranslationWorkspace history integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      value: jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            providers: {
              openai: {
                provider: 'openai',
                configured: true,
                defaultModelId: 'gpt-5-mini',
                models: [
                  {
                    id: 'gpt-5-mini',
                    label: 'GPT-5-mini',
                    source: 'live',
                  },
                ],
              },
              poe: {
                provider: 'poe',
                configured: true,
                defaultModelId: 'Claude-Sonnet-4.5',
                models: [
                  {
                    id: 'Claude-Sonnet-4.5',
                    label: 'Claude-Sonnet-4.5',
                    source: 'live',
                  },
                ],
              },
            },
          }),
      }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lists saved translations and restores one into the workspace', async () => {
    const user = userEvent.setup();

    const historyProject = {
      title: 'Archived translation',
      contentType: 'novel_chapter' as const,
      targetLanguage: getTargetLanguageConfig('en'),
      styleProfile: buildDefaultStyleProfile(),
      progress: 100,
      segments: [],
      glossary: [],
      qaFindings: [],
      pipelineStages: [],
    };

    const mockedTranslationHistory = jest.mocked(translationHistory);

    mockedTranslationHistory.loadTranslationHistoryEntries.mockReturnValue([
      {
        id: 'history-entry-1',
        route: '/translate',
        title: 'Archived translation',
        createdAt: '2026-05-21T10:00:00.000Z',
        updatedAt: '2026-05-21T10:00:00.000Z',
        preview: 'Archived translation preview.',
        sourceLanguageCode: 'sv',
        segmentationStrategy: 'paragraph',
        provider: 'openai',
        model: 'gpt-5-mini',
        mode: 'openai',
        contentType: 'novel_chapter',
        targetLanguageLabel: 'English',
        warningCount: 0,
      },
    ]);
    mockedTranslationHistory.loadTranslationHistoryEntry.mockReturnValue({
      id: 'history-entry-1',
      route: '/translate',
      title: 'Archived translation',
      createdAt: '2026-05-21T10:00:00.000Z',
      updatedAt: '2026-05-21T10:00:00.000Z',
      preview: 'Archived translation preview.',
      sourceLanguageCode: 'sv',
      sourceText: 'Restored source text.',
      segmentationStrategy: 'paragraph',
      project: historyProject,
      provider: 'poe',
      model: 'Claude-Sonnet-4.5',
      mode: 'poe',
      message: 'Translation completed with Poe.',
      warnings: [],
    });
    mockedTranslationHistory.restoreTranslationHistoryEntry.mockImplementation((entry) => ({
      sourceLanguageCode: entry.sourceLanguageCode,
      sourceText: entry.sourceText,
      segmentationStrategy: entry.segmentationStrategy,
      project: entry.project,
      provider: entry.provider,
      model: entry.model,
      mode: entry.mode,
      message: entry.message,
      warnings: entry.warnings,
    }));

    render(
      <TranslationWorkspace
        providerAvailability={{ openai: true, poe: true }}
        initialProvider="openai"
        initialModel="gpt-5-mini"
        initialSeed={{
          projectId: 'project-1',
          title: 'Current workspace',
          contentType: 'novel_chapter',
          sourceLanguageCode: 'sv',
          targetLanguage: getTargetLanguageConfig('en'),
          styleProfile: buildDefaultStyleProfile(),
          sourceText: 'Current source text.',
          glossary: [],
          segmentationStrategy: 'paragraph',
        }}
      />,
    );

    const accordionButton = await screen.findByRole('button', {
      name: /recent translations/i,
    });

    expect(accordionButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(accordionButton);

    await screen.findByRole('button', { name: /^open$/i });

    await user.click(screen.getByRole('button', { name: /^open$/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/source text/i)).toHaveValue('Restored source text.');
    });
    expect(
      screen.getByText(/restored "archived translation" from translation history/i),
    ).toBeVisible();
    expect(mockedTranslationHistory.loadTranslationHistoryEntry).toHaveBeenCalledWith(
      'history-entry-1',
    );
  });

  it('asks for confirmation before rerunning after a completed result is loaded', async () => {
    const user = userEvent.setup();
    const fetchMock = jest.mocked(global.fetch);

    const completedSegment: DocumentSegment = {
      id: 'segment-1',
      projectId: 'project-1',
      index: 0,
      sourceText: 'Hej världen.',
      sourceAnalysis: 'A brief opening line.',
      translationDraft: 'Hello world.',
      voiceAdaptedDraft: 'Hello, world.',
      literaryNaturalnessDraft: 'Hello, world.',
      polishedDraft: 'Hello, world.',
      professionalLiteraryCopyeditDraft: 'Hello, world.',
      finalText: 'Hello, world.',
      finalTextLocked: false,
      qaFindings: [],
      status: 'approved',
    };

    const completedProject = {
      title: 'Completed translation',
      contentType: 'novel_chapter' as const,
      targetLanguage: getTargetLanguageConfig('en'),
      styleProfile: buildDefaultStyleProfile(),
      progress: 100,
      segments: [completedSegment],
      glossary: [],
      qaFindings: [],
      pipelineStages: [],
    };

    const mockedTranslationHistory = jest.mocked(translationHistory);

    mockedTranslationHistory.loadTranslationHistoryEntries.mockReturnValue([
      {
        id: 'history-entry-2',
        route: '/translate',
        title: 'Completed translation',
        createdAt: '2026-05-22T10:00:00.000Z',
        updatedAt: '2026-05-22T10:00:00.000Z',
        preview: 'Completed translation preview.',
        sourceLanguageCode: 'sv',
        segmentationStrategy: 'paragraph',
        provider: 'openai',
        model: 'gpt-5-mini',
        mode: 'openai',
        contentType: 'novel_chapter',
        targetLanguageLabel: 'English',
        warningCount: 0,
      },
    ]);
    mockedTranslationHistory.loadTranslationHistoryEntry.mockReturnValue({
      id: 'history-entry-2',
      route: '/translate',
      title: 'Completed translation',
      createdAt: '2026-05-22T10:00:00.000Z',
      updatedAt: '2026-05-22T10:00:00.000Z',
      preview: 'Completed translation preview.',
      sourceLanguageCode: 'sv',
      sourceText: 'Hej världen.',
      segmentationStrategy: 'paragraph',
      project: completedProject,
      provider: 'openai',
      model: 'gpt-5-mini',
      mode: 'openai',
      message: 'Translation completed with OpenAI.',
      warnings: [],
    });
    mockedTranslationHistory.restoreTranslationHistoryEntry.mockImplementation((entry) => ({
      sourceLanguageCode: entry.sourceLanguageCode,
      sourceText: entry.sourceText,
      segmentationStrategy: entry.segmentationStrategy,
      project: entry.project,
      provider: entry.provider,
      model: entry.model,
      mode: entry.mode,
      message: entry.message,
      warnings: entry.warnings,
    }));

    render(
      <TranslationWorkspace
        providerAvailability={{ openai: true, poe: true }}
        initialProvider="openai"
        initialModel="gpt-5-mini"
        initialSeed={{
          projectId: 'project-1',
          title: 'Current workspace',
          contentType: 'novel_chapter',
          sourceLanguageCode: 'sv',
          targetLanguage: getTargetLanguageConfig('en'),
          styleProfile: buildDefaultStyleProfile(),
          sourceText: 'Current source text.',
          glossary: [],
          segmentationStrategy: 'paragraph',
        }}
      />,
    );

    const accordionButton = await screen.findByRole('button', {
      name: /recent translations/i,
    });

    await user.click(accordionButton);
    await user.click(screen.getByRole('button', { name: /^open$/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/source text/i)).toHaveValue('Hej världen.');
    });

    const fetchCallsBeforeRun = fetchMock.mock.calls.length;

    await user.click(screen.getAllByRole('button', { name: /run pipeline/i })[0]);

    expect(await screen.findByRole('dialog', { name: /run pipeline again/i })).toBeVisible();
    expect(fetchMock.mock.calls.length).toBe(fetchCallsBeforeRun);
    expect(
      fetchMock.mock.calls.some(
        ([url]) => typeof url === 'string' && url.includes('/api/translate'),
      ),
    ).toBe(false);
  });
});
