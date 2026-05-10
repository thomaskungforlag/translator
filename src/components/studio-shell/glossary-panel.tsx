import type { ReactElement } from 'react';

import {
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import type { GlossaryEntry } from '@/lib/domain';

type GlossaryPanelProps = {
  entries: GlossaryEntry[];
};

export function GlossaryPanel({ entries }: GlossaryPanelProps): ReactElement {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography variant="overline" color="text.secondary">
        Glossary snapshot
      </Typography>
      <List dense sx={{ mt: 1 }}>
        {entries.map((entry) => (
          <ListItem key={entry.id} disablePadding sx={{ py: 0.5 }}>
            <ListItemButton sx={{ borderRadius: 2 }}>
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 650 }}>
                      {entry.sourceTerm}
                    </Typography>
                    <Chip size="small" label={entry.category} variant="outlined" />
                  </Stack>
                }
                secondary={entry.targetTerm}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
