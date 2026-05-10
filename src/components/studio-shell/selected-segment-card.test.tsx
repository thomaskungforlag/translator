import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { DocumentSegment } from '@/lib/domain';

import { SelectedSegmentCard } from './selected-segment-card';

const demoSegment: DocumentSegment = {
  id: 'segment-1',
  projectId: 'project-1',
  index: 0,
  sourceText: 'Det hade borjat snoa.',
  sourceAnalysis: 'Brief source analysis.',
  translationDraft: 'It had started to snow.',
  voiceAdaptedDraft: 'Snow was beginning to fall.',
  literaryNaturalnessDraft: 'Snow had started to fall.',
  polishedDraft: 'Snow had begun to fall.',
  professionalLiteraryCopyeditDraft: 'Snow had begun to fall.',
  finalText: 'Snow had begun to fall.',
  finalTextLocked: false,
  qaFindings: [],
  status: 'approved',
};

describe('SelectedSegmentCard', () => {
  it('renders editable final text controls in final approved pass', async () => {
    const user = userEvent.setup();
    const handleFinalTextChange = jest.fn();
    const handleFinalTextLockChange = jest.fn();

    render(
      <SelectedSegmentCard
        activePass={6}
        selectedSegment={demoSegment}
        onFinalTextChange={handleFinalTextChange}
        onFinalTextLockChange={handleFinalTextLockChange}
      />,
    );

    const finalTextField = screen.getByRole('textbox', { name: /final text/i });
    await user.clear(finalTextField);
    await user.type(finalTextField, 'Updated final text');

    expect(handleFinalTextChange).toHaveBeenCalled();

    const lockToggle = screen.getByRole('switch', { name: /lock this final text on re-run/i });
    await user.click(lockToggle);

    expect(handleFinalTextLockChange).toHaveBeenCalledWith(true);
  });

  it('renders read-only pass text outside final approved pass', () => {
    render(<SelectedSegmentCard activePass={0} selectedSegment={demoSegment} />);

    expect(screen.getByText('It had started to snow.')).toBeVisible();
    expect(screen.queryByRole('textbox', { name: /final text/i })).not.toBeInTheDocument();
  });
});
