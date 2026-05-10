import type { GlossaryEntry, StyleProfile } from '@/lib/domain';
import type { StudioShellProject } from '@/lib/workspace';

export type StudioShellProps = {
  apiKeyConfigured: boolean;
  activeRuntimeModelLabel: string;
  project: StudioShellProject;
  onRunPipeline?: () => void;
  onExportMarkdown?: () => void;
  onExportQaReport?: () => void;
  onExportProjectJson?: () => void;
  onCopyFinalText?: () => void;
  onCopyQaSummary?: () => void;
  onStyleProfileUpdate?: (patch: Partial<StyleProfile>) => void;
  onQaFindingResolvedChange?: (findingId: string, resolved: boolean) => void;
  onSegmentFinalTextChange?: (segmentId: string, value: string) => void;
  onSegmentFinalTextLockChange?: (segmentId: string, locked: boolean) => void;
  onGlossaryEntryAdd?: () => void;
  onGlossaryEntryUpdate?: (entryId: string, patch: Partial<GlossaryEntry>) => void;
  onGlossaryEntryRemove?: (entryId: string) => void;
  isRunning?: boolean;
};
