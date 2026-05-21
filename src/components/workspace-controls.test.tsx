import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { WorkspaceControls } from './workspace-controls';

describe('WorkspaceControls', () => {
  it('keeps the scene actions in a sticky toolbar and exposes the overflow menu', async () => {
    const user = userEvent.setup();
    const onEditableSegmentAdd = jest.fn();
    const onProviderChange = jest.fn();

    render(
      <WorkspaceControls
        sourceText="Alpha\n\nBeta"
        contentType="novel_chapter"
        targetLanguage={{
          code: 'en',
          label: 'English',
          locale: 'en',
          translationNotes: [],
          dialogueRules: [],
          punctuationRules: [],
          marketQualityNotes: [],
        }}
        segmentationStrategy="hybrid"
        selectedProvider="openai"
        selectedModel="gpt-5-mini"
        providerOptions={{
          openai: {
            provider: 'openai',
            configured: true,
            defaultModelId: 'gpt-5-mini',
            models: [
              { id: 'gpt-5-mini', label: 'GPT-5-mini', source: 'live' },
              { id: 'gpt-4o', label: 'GPT-4o', source: 'live' },
            ],
          },
          poe: {
            provider: 'poe',
            configured: true,
            defaultModelId: 'Claude-Sonnet-4.5',
            models: [{ id: 'Claude-Sonnet-4.5', label: 'Claude-Sonnet-4.5', source: 'live' }],
          },
        }}
        segmentPreviewCount={12}
        editableSegments={Array.from({ length: 12 }, (_, index) => `Segment ${index + 1}`)}
        isRunning={false}
        runElapsedSeconds={0}
        pipelineWarnings={[]}
        onSourceTextChange={jest.fn()}
        onSegmentationStrategyChange={jest.fn()}
        onProviderChange={onProviderChange}
        onModelChange={jest.fn()}
        onEditableSegmentChange={jest.fn()}
        onEditableSegmentAdd={onEditableSegmentAdd}
        onEditableSegmentRemove={jest.fn()}
        onSplitSourceByLineBreaks={jest.fn()}
        onImportText={jest.fn()}
        onRunPipeline={jest.fn()}
        onReviewSegment={jest.fn()}
      />,
    );

    expect(screen.getByTestId('workspace-actions-toolbar')).toHaveStyle({ position: 'sticky' });

    await user.click(screen.getByRole('combobox', { name: /provider/i }));
    await user.click(screen.getByRole('option', { name: /poe/i }));
    expect(onProviderChange).toHaveBeenCalledWith('poe');

    await user.click(screen.getByRole('button', { name: /scene actions/i }));

    await user.click(screen.getByRole('menuitem', { name: /add segment/i }));

    expect(onEditableSegmentAdd).toHaveBeenCalledTimes(1);
  });

  it('surfaces structured recovery guidance when a provider fallback occurs', async () => {
    const user = userEvent.setup();
    const onReviewSegment = jest.fn();

    render(
      <WorkspaceControls
        sourceText="Alpha\n\nBeta"
        contentType="novel_chapter"
        targetLanguage={{
          code: 'en',
          label: 'English',
          locale: 'en',
          translationNotes: [],
          dialogueRules: [],
          punctuationRules: [],
          marketQualityNotes: [],
        }}
        segmentationStrategy="hybrid"
        selectedProvider="poe"
        selectedModel="Claude-Sonnet-4.5"
        providerOptions={{
          openai: {
            provider: 'openai',
            configured: true,
            defaultModelId: 'gpt-5-mini',
            models: [{ id: 'gpt-5-mini', label: 'GPT-5-mini', source: 'live' }],
          },
          poe: {
            provider: 'poe',
            configured: true,
            defaultModelId: 'Claude-Sonnet-4.5',
            models: [{ id: 'Claude-Sonnet-4.5', label: 'Claude-Sonnet-4.5', source: 'live' }],
          },
        }}
        segmentPreviewCount={2}
        editableSegments={['Alpha', 'Beta']}
        isRunning={false}
        runElapsedSeconds={0}
        pipelineWarnings={[
          'professional_literary_copyedit recovered with local fallback for source segment index(es): 0-0. Reason: Poe returned invalid stage_response JSON after repair attempt.',
        ]}
        onSourceTextChange={jest.fn()}
        onSegmentationStrategyChange={jest.fn()}
        onProviderChange={jest.fn()}
        onModelChange={jest.fn()}
        onEditableSegmentChange={jest.fn()}
        onEditableSegmentAdd={jest.fn()}
        onEditableSegmentRemove={jest.fn()}
        onSplitSourceByLineBreaks={jest.fn()}
        onImportText={jest.fn()}
        onRunPipeline={jest.fn()}
        onReviewSegment={onReviewSegment}
      />,
    );

    const recoveryDetails = screen.getByTestId('workspace-recovery-details');

    expect(recoveryDetails).toHaveTextContent(/Recovery details/i);
    expect(recoveryDetails).toHaveTextContent(/Professional literary copyedit/i);
    expect(recoveryDetails).toHaveTextContent(/Segment 1/i);
    expect(recoveryDetails).toHaveTextContent(
      /Poe returned invalid stage_response JSON after repair attempt/i,
    );
    expect(recoveryDetails).toHaveTextContent(
      /recovered locally after the provider returned invalid structured output/i,
    );

    await user.click(screen.getByRole('button', { name: /review segment 1/i }));
    expect(onReviewSegment).toHaveBeenCalledWith(0);
  });
});
