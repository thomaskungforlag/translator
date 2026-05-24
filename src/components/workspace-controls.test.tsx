import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { WorkspaceControls } from './workspace-controls';
import {
  contentTypeOptions,
  getTargetLanguageConfig,
  targetLanguageOptions,
} from '@/lib/workspace-options';

describe('WorkspaceControls', () => {
  it('keeps the scene actions in a sticky toolbar and exposes the overflow menu', async () => {
    const user = userEvent.setup();
    const onEditableSegmentAdd = jest.fn();
    const onProviderChange = jest.fn();
    const onCopyFinalText = jest.fn();

    render(
      <WorkspaceControls
        sourceText="Alpha\n\nBeta"
        contentType="novel_chapter"
        targetLanguage={getTargetLanguageConfig('en')}
        contentTypeOptions={contentTypeOptions}
        targetLanguageOptions={targetLanguageOptions}
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
        onContentTypeChange={jest.fn()}
        onTargetLanguageChange={jest.fn()}
        onSegmentationStrategyChange={jest.fn()}
        onProviderChange={onProviderChange}
        onModelChange={jest.fn()}
        onEditableSegmentChange={jest.fn()}
        onEditableSegmentAdd={onEditableSegmentAdd}
        onEditableSegmentRemove={jest.fn()}
        onSplitSourceByLineBreaks={jest.fn()}
        onImportText={jest.fn()}
        onRunPipeline={jest.fn()}
        onCopyFinalText={onCopyFinalText}
        onReviewSegment={jest.fn()}
      />,
    );

    expect(screen.getByTestId('workspace-actions-toolbar')).toHaveStyle({ position: 'sticky' });

    await user.click(screen.getByRole('combobox', { name: /provider/i }));
    await user.click(screen.getByRole('option', { name: /poe/i }));
    expect(onProviderChange).toHaveBeenCalledWith('poe');

    await user.click(screen.getByRole('button', { name: /copy final text/i }));
    expect(onCopyFinalText).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /scene actions/i }));

    await user.click(screen.getByRole('menuitem', { name: /add segment/i }));

    expect(onEditableSegmentAdd).toHaveBeenCalledTimes(1);
  });

  it('allows content type and target language selection', async () => {
    const user = userEvent.setup();
    const onContentTypeChange = jest.fn();
    const onTargetLanguageChange = jest.fn();

    render(
      <WorkspaceControls
        sourceText="Alpha\n\nBeta"
        contentType="novel_chapter"
        targetLanguage={getTargetLanguageConfig('en')}
        contentTypeOptions={contentTypeOptions}
        targetLanguageOptions={targetLanguageOptions}
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
        segmentPreviewCount={2}
        editableSegments={['Alpha', 'Beta']}
        isRunning={false}
        runElapsedSeconds={0}
        pipelineWarnings={[]}
        onSourceTextChange={jest.fn()}
        onContentTypeChange={onContentTypeChange}
        onTargetLanguageChange={onTargetLanguageChange}
        onSegmentationStrategyChange={jest.fn()}
        onProviderChange={jest.fn()}
        onModelChange={jest.fn()}
        onEditableSegmentChange={jest.fn()}
        onEditableSegmentAdd={jest.fn()}
        onEditableSegmentRemove={jest.fn()}
        onSplitSourceByLineBreaks={jest.fn()}
        onImportText={jest.fn()}
        onRunPipeline={jest.fn()}
        onCopyFinalText={jest.fn()}
        onReviewSegment={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('combobox', { name: /content type/i }));
    await user.click(screen.getByRole('option', { name: /website copy/i }));
    expect(onContentTypeChange).toHaveBeenCalledWith('website_copy');

    await user.click(screen.getByRole('combobox', { name: /target language/i }));
    await user.click(screen.getByRole('option', { name: /german/i }));
    expect(onTargetLanguageChange).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'de',
        label: 'German',
      }),
    );
  });

  it('surfaces structured recovery guidance when a provider fallback occurs', async () => {
    const user = userEvent.setup();
    const onReviewSegment = jest.fn();

    render(
      <WorkspaceControls
        sourceText="Alpha\n\nBeta"
        contentType="novel_chapter"
        targetLanguage={getTargetLanguageConfig('en')}
        contentTypeOptions={contentTypeOptions}
        targetLanguageOptions={targetLanguageOptions}
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
        onCopyFinalText={jest.fn()}
        onReviewSegment={onReviewSegment}
        onContentTypeChange={jest.fn()}
        onTargetLanguageChange={jest.fn()}
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

  it('locks mutating source controls while a run is in progress', () => {
    render(
      <WorkspaceControls
        sourceText="Alpha\n\nBeta"
        contentType="novel_chapter"
        targetLanguage={getTargetLanguageConfig('en')}
        contentTypeOptions={contentTypeOptions}
        targetLanguageOptions={targetLanguageOptions}
        segmentationStrategy="hybrid"
        selectedProvider="openai"
        selectedModel="gpt-5-mini"
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
        isRunning
        runElapsedSeconds={12}
        pipelineWarnings={[]}
        onSourceTextChange={jest.fn()}
        onContentTypeChange={jest.fn()}
        onTargetLanguageChange={jest.fn()}
        onSegmentationStrategyChange={jest.fn()}
        onProviderChange={jest.fn()}
        onModelChange={jest.fn()}
        onEditableSegmentChange={jest.fn()}
        onEditableSegmentAdd={jest.fn()}
        onEditableSegmentRemove={jest.fn()}
        onSplitSourceByLineBreaks={jest.fn()}
        onImportText={jest.fn()}
        onRunPipeline={jest.fn()}
        onCopyFinalText={jest.fn()}
        onReviewSegment={jest.fn()}
      />,
    );

    expect(screen.getByRole('textbox', { name: /source text \(original\)/i })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: /content type/i })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('combobox', { name: /target language/i })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('combobox', { name: /provider/i })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('combobox', { name: /model/i })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('combobox', { name: /segmentation/i })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('button', { name: /scene actions/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /import text\/markdown/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /running pipeline/i })).toBeDisabled();
    expect(screen.getByTestId('workspace-running-status')).toBeVisible();
    expect(screen.getByRole('textbox', { name: /segment 1/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /remove segment 1/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /copy final text/i })).not.toBeDisabled();
  });
});
