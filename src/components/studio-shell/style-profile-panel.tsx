import type { ReactElement } from 'react';

import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { Chip, Paper, Stack, TextField, Typography } from '@mui/material';

import type { StyleProfile } from '@/lib/domain';

type StyleProfilePanelProps = {
  profile: StyleProfile;
  isRunning?: boolean;
  onUpdateProfile?: (patch: Partial<StyleProfile>) => void;
};

function joinLines(values: string[]): string {
  return values.join('\n');
}

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function StyleProfilePanel({
  profile,
  isRunning = false,
  onUpdateProfile,
}: StyleProfilePanelProps): ReactElement {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Typography variant="overline" color="text.secondary">
            Style profile
          </Typography>
          <Chip
            size="small"
            icon={<EditOutlinedIcon />}
            label={`${profile.sampleTexts.length} samples`}
          />
        </Stack>

        <TextField
          label="Profile name"
          value={profile.name}
          disabled={isRunning}
          onChange={(event) => onUpdateProfile?.({ name: event.target.value })}
          fullWidth
        />

        <TextField
          label="Description"
          value={profile.description}
          disabled={isRunning}
          onChange={(event) => onUpdateProfile?.({ description: event.target.value })}
          fullWidth
          multiline
          minRows={2}
        />

        <TextField
          label="Voice principles"
          value={joinLines(profile.voicePrinciples)}
          disabled={isRunning}
          onChange={(event) =>
            onUpdateProfile?.({ voicePrinciples: splitLines(event.target.value) })
          }
          fullWidth
          multiline
          minRows={4}
        />

        <TextField
          label="Preferred tone"
          value={joinLines(profile.preferredTone)}
          disabled={isRunning}
          onChange={(event) => onUpdateProfile?.({ preferredTone: splitLines(event.target.value) })}
          fullWidth
          multiline
          minRows={3}
        />

        <TextField
          label="Avoid patterns"
          value={joinLines(profile.avoidPatterns)}
          disabled={isRunning}
          onChange={(event) => onUpdateProfile?.({ avoidPatterns: splitLines(event.target.value) })}
          fullWidth
          multiline
          minRows={3}
        />

        <TextField
          label="Sentence rhythm notes"
          value={joinLines(profile.sentenceRhythmNotes)}
          disabled={isRunning}
          onChange={(event) =>
            onUpdateProfile?.({ sentenceRhythmNotes: splitLines(event.target.value) })
          }
          fullWidth
          multiline
          minRows={3}
        />

        <TextField
          label="Genre notes"
          value={joinLines(profile.genreNotes)}
          disabled={isRunning}
          onChange={(event) => onUpdateProfile?.({ genreNotes: splitLines(event.target.value) })}
          fullWidth
          multiline
          minRows={3}
        />
      </Stack>
    </Paper>
  );
}
