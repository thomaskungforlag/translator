import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { QAFindingsPanel } from './qa-findings-panel';
import type { QAFinding } from '@/lib/domain';

const finding: QAFinding = {
  id: 'finding-1',
  severity: 'warning',
  category: 'tone_shift',
  issue: 'Tone drifts from source in final sentence.',
  suggestion: 'Use a more restrained register.',
  resolved: false,
};

describe('QAFindingsPanel', () => {
  it('toggles resolved state via callback', async () => {
    const user = userEvent.setup();
    const onResolvedChange = jest.fn();

    render(<QAFindingsPanel findings={[finding]} onResolvedChange={onResolvedChange} />);

    await user.click(screen.getByRole('switch', { name: /mark finding as resolved/i }));

    expect(onResolvedChange).toHaveBeenCalledWith('finding-1', true);
  });
});
