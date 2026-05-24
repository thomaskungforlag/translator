import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { DocumentSegment } from '@/lib/domain';

import { SelectedSegmentCard } from './selected-segment-card';

const demoSegment: DocumentSegment = {
  id: 'segment-1',
  projectId: 'project-1',
  index: 0,
  sourceText: 'Morgonljuset lag kallt over kajen.',
  sourceAnalysis: 'Brief source analysis.',
  translationDraft: 'Morning light lay cold over the quay.',
  voiceAdaptedDraft: 'Cold morning light lay over the quay.',
  literaryNaturalnessDraft: 'Cold morning light settled over the quay.',
  polishedDraft: 'Cold morning light rested over the quay.',
  professionalLiteraryCopyeditDraft: 'Cold morning light rested over the quay.',
  finalText: 'Cold morning light rested over the quay.',
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

  it('locks final text editing while the pipeline is running', () => {
    render(<SelectedSegmentCard activePass={6} selectedSegment={demoSegment} isRunning />);

    expect(screen.getByTestId('selected-segment-running-banner')).toBeVisible();
    expect(screen.getByRole('textbox', { name: /final text/i })).toBeDisabled();
    expect(screen.getByRole('switch', { name: /lock this final text on re-run/i })).toBeDisabled();
  });

  it('renders read-only pass text outside final approved pass', () => {
    render(<SelectedSegmentCard activePass={0} selectedSegment={demoSegment} />);

    expect(screen.getByText('Morning light lay cold over the quay.')).toBeVisible();
    expect(screen.queryByRole('textbox', { name: /final text/i })).not.toBeInTheDocument();
  });
});
