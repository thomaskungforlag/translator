import type { StudioShellProject } from '@/lib/workspace';

export type StudioShellProps = {
  apiKeyConfigured: boolean;
  activeRuntimeModelLabel: string;
  project: StudioShellProject;
  onRunPipeline?: () => void;
  onExportMarkdown?: () => void;
  onCopyFinalText?: () => void;
  onCopyQaSummary?: () => void;
  onQaFindingResolvedChange?: (findingId: string, resolved: boolean) => void;
  onSegmentFinalTextChange?: (segmentId: string, value: string) => void;
  onSegmentFinalTextLockChange?: (segmentId: string, locked: boolean) => void;
  isRunning?: boolean;
};
