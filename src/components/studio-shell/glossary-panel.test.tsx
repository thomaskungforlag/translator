import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { GlossaryEntry } from '@/lib/domain';

import { GlossaryPanel } from './glossary-panel';

const entries: GlossaryEntry[] = [
  {
    id: 'gl-1',
    sourceTerm: 'Auroraporten',
    targetTerm: 'Aurora Gate',
    category: 'worldbuilding',
    locked: true,
  },
];

describe('GlossaryPanel', () => {
  it('triggers add and remove callbacks', async () => {
    const user = userEvent.setup();
    const onAddEntry = jest.fn();
    const onRemoveEntry = jest.fn();

    render(
      <GlossaryPanel entries={entries} onAddEntry={onAddEntry} onRemoveEntry={onRemoveEntry} />,
    );

    await user.click(screen.getByRole('button', { name: /add glossary term/i }));
    await user.click(screen.getByRole('button', { name: /remove glossary entry/i }));

    expect(onAddEntry).toHaveBeenCalledTimes(1);
    expect(onRemoveEntry).toHaveBeenCalledWith('gl-1');
  });

  it('triggers update callback for source term and lock toggle', async () => {
    const user = userEvent.setup();
    const onUpdateEntry = jest.fn();

    render(<GlossaryPanel entries={entries} onUpdateEntry={onUpdateEntry} />);

    const sourceField = screen.getByRole('textbox', { name: /source/i });
    await user.clear(sourceField);
    await user.type(sourceField, 'Sodra kajen');

    const lockSwitch = screen.getByRole('switch', { name: /locked/i });
    await user.click(lockSwitch);

    expect(onUpdateEntry).toHaveBeenCalled();
    expect(onUpdateEntry).toHaveBeenCalledWith(
      'gl-1',
      expect.objectContaining({
        locked: false,
      }),
    );
  });
});
