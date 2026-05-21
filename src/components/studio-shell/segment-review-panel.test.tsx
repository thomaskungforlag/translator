import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { DocumentSegment } from '@/lib/domain';

import { SegmentReviewPanel } from './segment-review-panel';

function setMatchMedia(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

function buildSegment(index: number, sourceText: string, finalText: string): DocumentSegment {
  return {
    id: `segment-${index + 1}`,
    projectId: 'project-1',
    index,
    sourceText,
    sourceAnalysis: `Analysis for segment ${index + 1}.`,
    translationDraft: `Faithful draft ${index + 1}.`,
    voiceAdaptedDraft: `Voice draft ${index + 1}.`,
    literaryNaturalnessDraft: `Naturalness draft ${index + 1}.`,
    polishedDraft: `Polished draft ${index + 1}.`,
    professionalLiteraryCopyeditDraft: finalText,
    finalText,
    finalTextLocked: false,
    qaFindings: [
      {
        id: `qa-${index + 1}`,
        severity: 'warning',
        category: 'translation_stiffness',
        issue: `Check segment ${index + 1}.`,
        resolved: false,
      },
    ],
    status: 'reviewed',
  };
}

describe('SegmentReviewPanel', () => {
  beforeEach(() => {
    setMatchMedia(false);
  });

  it('keeps the segment navigator and inspector bounded for long scenes', () => {
    const longSourceText =
      'This is a deliberately long scene with many repeated phrases to exercise the compact navigator and the bounded inspector. '.repeat(
        10,
      );
    const segments = [
      buildSegment(0, longSourceText, 'Final draft 1.'),
      buildSegment(1, 'Short scene.', 'Final draft 2.'),
    ];

    render(<SegmentReviewPanel segments={segments} />);

    expect(screen.getByTestId('segment-list-scroll')).toHaveStyle({ overflowY: 'auto' });
    expect(screen.getByTestId('selected-segment-source-scroll')).toHaveStyle({ overflowY: 'auto' });
    expect(screen.getByTestId('selected-segment-pass-scroll')).toHaveStyle({ overflowY: 'auto' });
    expect(screen.getByTestId('segment-select-1')).toHaveTextContent('words');
    expect(screen.getByTestId('segment-select-1')).toHaveTextContent('…');
  });

  it('opens mobile focus mode as a full-screen dialog', async () => {
    const user = userEvent.setup();
    const segments = [buildSegment(0, 'A long source segment.', 'Final draft 1.')];

    render(<SegmentReviewPanel segments={segments} />);

    await user.click(screen.getByRole('button', { name: /open focus mode/i }));

    expect(screen.getByTestId('segment-focus-dialog')).toBeVisible();
    expect(screen.getByText(/focus mode/i)).toBeVisible();
  });

  it('opens desktop focus mode as a right-side drawer', async () => {
    setMatchMedia(true);
    const user = userEvent.setup();
    const segments = [buildSegment(0, 'A long source segment.', 'Final draft 1.')];

    render(<SegmentReviewPanel segments={segments} />);

    await user.click(screen.getByRole('button', { name: /open focus mode/i }));

    expect(screen.getByTestId('segment-focus-drawer')).toBeVisible();
    expect(screen.getByText(/focus mode/i)).toBeVisible();
  });

  it('jumps to an externally selected segment index', async () => {
    const segments = [
      buildSegment(0, 'First source paragraph.', 'Final draft 1.'),
      buildSegment(1, 'Second source paragraph.', 'Final draft 2.'),
    ];

    render(<SegmentReviewPanel segments={segments} selectedSegmentIndex={1} />);

    expect(await screen.findByTestId('selected-segment-text')).toHaveTextContent(
      'Second source paragraph.',
    );
  });
});
