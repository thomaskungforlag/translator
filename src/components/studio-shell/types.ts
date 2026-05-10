import type { StudioShellProject } from '@/lib/workspace';

export type StudioShellProps = {
  apiKeyConfigured: boolean;
  project: StudioShellProject;
  onRunPipeline?: () => void;
  onExportMarkdown?: () => void;
  isRunning?: boolean;
};
