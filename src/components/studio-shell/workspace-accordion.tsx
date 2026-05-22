import { useState, type ReactElement, type ReactNode } from 'react';

import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Stack,
  Typography,
} from '@mui/material';

type WorkspaceAccordionProps = {
  title: string;
  caption?: string;
  badge?: ReactNode;
  defaultExpanded?: boolean;
  children: ReactNode;
};

export function WorkspaceAccordion({
  title,
  caption,
  badge,
  defaultExpanded = false,
  children,
}: WorkspaceAccordionProps): ReactElement {
  const [initialExpanded] = useState<boolean>(() => defaultExpanded);

  return (
    <Accordion
      defaultExpanded={initialExpanded}
      disableGutters
      elevation={0}
      sx={{
        bgcolor: 'transparent',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        overflow: 'hidden',
        '&:before': {
          display: 'none',
        },
      }}
    >
      <AccordionSummary
        expandIcon={<KeyboardArrowDownRoundedIcon />}
        sx={{
          px: 1.5,
          py: 0.5,
          '& .MuiAccordionSummary-content': {
            my: 1,
          },
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            {caption ? (
              <Typography variant="caption" color="text.secondary">
                {caption}
              </Typography>
            ) : null}
          </Box>
          {badge ? badge : null}
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1.5, pb: 1.5, pt: 0 }}>{children}</AccordionDetails>
    </Accordion>
  );
}
