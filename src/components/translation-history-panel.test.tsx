import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TranslationHistoryPanel } from './translation-history-panel';

describe('TranslationHistoryPanel', () => {
  it('shows recent runs and opens the selected record', async () => {
    const user = userEvent.setup();
    const onOpenEntry = jest.fn();

    render(
      <TranslationHistoryPanel
        entries={[
          {
            id: 'entry-1',
            route: '/translate',
            title: 'Chapter 7',
            createdAt: '2026-05-21T10:00:00.000Z',
            updatedAt: '2026-05-21T10:00:00.000Z',
            preview: 'A translated passage appears here.',
            sourceLanguageCode: 'sv',
            segmentationStrategy: 'paragraph',
            provider: 'openai',
            model: 'gpt-5-mini',
            mode: 'openai',
            contentType: 'novel_chapter',
            targetLanguageLabel: 'English',
            warningCount: 2,
          },
        ]}
        onOpenEntry={onOpenEntry}
      />,
    );

    expect(screen.getByText(/chapter 7/i)).toBeVisible();
    expect(screen.getByText(/saved locally in this browser/i)).toBeVisible();
    expect(screen.getByText(/a translated passage appears here/i)).toBeVisible();

    await user.click(screen.getByRole('button', { name: /open/i }));

    expect(onOpenEntry).toHaveBeenCalledWith('entry-1');
  });
});
