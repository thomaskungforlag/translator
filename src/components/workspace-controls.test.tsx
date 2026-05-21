import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { WorkspaceControls } from './workspace-controls';

describe('WorkspaceControls', () => {
  it('keeps the scene actions in a sticky toolbar and exposes the overflow menu', async () => {
    const user = userEvent.setup();
    const onEditableSegmentAdd = jest.fn();

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
        segmentPreviewCount={12}
        editableSegments={Array.from({ length: 12 }, (_, index) => `Segment ${index + 1}`)}
        isRunning={false}
        runElapsedSeconds={0}
        onSourceTextChange={jest.fn()}
        onSegmentationStrategyChange={jest.fn()}
        onEditableSegmentChange={jest.fn()}
        onEditableSegmentAdd={onEditableSegmentAdd}
        onEditableSegmentRemove={jest.fn()}
        onSplitSourceByLineBreaks={jest.fn()}
        onImportText={jest.fn()}
        onRunPipeline={jest.fn()}
      />,
    );

    expect(screen.getByTestId('workspace-actions-toolbar')).toHaveStyle({ position: 'sticky' });

    await user.click(screen.getByRole('button', { name: /scene actions/i }));

    await user.click(screen.getByRole('menuitem', { name: /add segment/i }));

    expect(onEditableSegmentAdd).toHaveBeenCalledTimes(1);
  });
});
