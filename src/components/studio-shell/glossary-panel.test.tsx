import { render, screen, waitFor } from '@testing-library/react';
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

  it('locks glossary editing while running', () => {
    render(<GlossaryPanel entries={entries} isRunning />);

    expect(screen.getByRole('textbox', { name: /source/i })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: /target/i })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: /category/i })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('switch', { name: /locked/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /remove glossary entry/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /add glossary term/i })).toBeDisabled();
  });

  it('exports and restores glossary backups', async () => {
    const user = userEvent.setup();
    const onExportGlossary = jest.fn();
    const onImportGlossary = jest.fn();
    const { container } = render(
      <GlossaryPanel
        entries={entries}
        onExportGlossary={onExportGlossary}
        onImportGlossary={onImportGlossary}
      />,
    );

    await user.click(screen.getByRole('button', { name: /export glossary/i }));
    expect(onExportGlossary).toHaveBeenCalledTimes(1);

    const importInput = container.querySelector('input[type="file"]');

    expect(importInput).not.toBeNull();

    await user.upload(
      importInput as HTMLInputElement,
      new File(
        [
          JSON.stringify({
            version: 1,
            exportedAt: '2026-05-26T10:00:00.000Z',
            glossary: [
              {
                id: 'gl-2',
                sourceTerm: 'Södra kajen',
                targetTerm: 'South Quay',
                category: 'place',
                locked: true,
              },
            ],
          }),
        ],
        'glossary-backup.json',
        {
          type: 'application/json',
        },
      ),
    );

    await waitFor(() => {
      expect(onImportGlossary).toHaveBeenCalledWith(
        expect.stringContaining('Södra kajen'),
        'glossary-backup.json',
      );
    });
  });
});
