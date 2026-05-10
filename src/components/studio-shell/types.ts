import type { StudioShellProject } from '@/lib/workspace';

export type StudioShellProps = {
  apiKeyConfigured: boolean;
  project: StudioShellProject;
  onRunPipeline?: () => void;
  onExportMarkdown?: () => void;
  onCopyFinalText?: () => void;
  onCopyQaSummary?: () => void;
  onSegmentFinalTextChange?: (segmentId: string, value: string) => void;
  onSegmentFinalTextLockChange?: (segmentId: string, locked: boolean) => void;
  isRunning?: boolean;
};
