import { useRef, type ChangeEvent, type ReactElement } from 'react';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import UploadRoundedIcon from '@mui/icons-material/UploadRounded';
import {
  Button,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Switch,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import type { GlossaryEntry } from '@/lib/domain';

type GlossaryPanelProps = {
  entries: GlossaryEntry[];
  isRunning?: boolean;
  onAddEntry?: () => void;
  onUpdateEntry?: (entryId: string, patch: Partial<GlossaryEntry>) => void;
  onRemoveEntry?: (entryId: string) => void;
  onExportGlossary?: () => void;
  onImportGlossary?: (value: string, fileName: string) => void;
};

function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text();
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('Unable to read the selected file.'));
    };
    reader.readAsText(file);
  });
}

export function GlossaryPanel({
  entries,
  isRunning = false,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
  onExportGlossary,
  onImportGlossary,
}: GlossaryPanelProps): ReactElement {
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = (): void => {
    importInputRef.current?.click();
  };

  const handleImportChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (isRunning || !file) {
      return;
    }

    const importedGlossary = await readFileAsText(file);
    onImportGlossary?.(importedGlossary, file.name);
    input.value = '';
  };

  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography variant="overline" color="text.secondary">
        Glossary
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DownloadRoundedIcon />}
          onClick={onExportGlossary}
          disabled={isRunning}
        >
          Export glossary
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<UploadRoundedIcon />}
          onClick={handleImportClick}
          disabled={isRunning}
        >
          Import glossary
        </Button>
      </Stack>
      <Stack spacing={1.25} sx={{ mt: 1.25 }}>
        {entries.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No glossary terms yet. Add your first locked term below.
          </Typography>
        ) : null}

        {entries.map((entry) => (
          <Stack
            key={entry.id}
            spacing={1}
            sx={{ p: 1.25, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <TextField
                size="small"
                fullWidth
                label="Source"
                value={entry.sourceTerm}
                disabled={isRunning}
                onChange={(event) =>
                  onUpdateEntry?.(entry.id, {
                    sourceTerm: event.target.value,
                  })
                }
              />
              <IconButton
                size="small"
                color="error"
                aria-label={`Remove glossary entry ${entry.sourceTerm || entry.id}`}
                onClick={() => onRemoveEntry?.(entry.id)}
                disabled={isRunning}
              >
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>

            <TextField
              size="small"
              fullWidth
              label="Target"
              value={entry.targetTerm}
              disabled={isRunning}
              onChange={(event) =>
                onUpdateEntry?.(entry.id, {
                  targetTerm: event.target.value,
                })
              }
            />

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <TextField
                size="small"
                select
                fullWidth
                label="Category"
                value={entry.category}
                disabled={isRunning}
                onChange={(event) =>
                  onUpdateEntry?.(entry.id, {
                    category: event.target.value as GlossaryEntry['category'],
                  })
                }
              >
                <MenuItem value="character">character</MenuItem>
                <MenuItem value="place">place</MenuItem>
                <MenuItem value="technology">technology</MenuItem>
                <MenuItem value="worldbuilding">worldbuilding</MenuItem>
                <MenuItem value="phrase">phrase</MenuItem>
                <MenuItem value="other">other</MenuItem>
              </TextField>
              <FormControlLabel
                control={
                  <Switch
                    checked={entry.locked}
                    disabled={isRunning}
                    onChange={(_, checked) =>
                      onUpdateEntry?.(entry.id, {
                        locked: checked,
                      })
                    }
                  />
                }
                label="Locked"
              />
            </Stack>
          </Stack>
        ))}

        <Button
          variant="outlined"
          startIcon={<AddRoundedIcon />}
          onClick={onAddEntry}
          disabled={isRunning}
          sx={{ alignSelf: 'flex-start' }}
        >
          Add glossary term
        </Button>
      </Stack>
      <input
        ref={importInputRef}
        hidden
        disabled={isRunning}
        type="file"
        accept=".json,application/json"
        onChange={(event) => {
          void handleImportChange(event);
        }}
      />
    </Paper>
  );
}
