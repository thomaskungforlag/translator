import type {
  ContentType,
  DocumentSegment,
  GlossaryEntry,
  LanguageConfig,
  QAFinding,
  SegmentStatus,
} from '@/lib/domain';

export type StudioShellProject = {
  title: string;
  contentType: ContentType;
  targetLanguage: LanguageConfig;
  progress: number;
  segments: DocumentSegment[];
  glossary: GlossaryEntry[];
  qaFindings: QAFinding[];
  pipelineStages: Array<{ label: string; status: SegmentStatus | 'running' | 'idle' }>;
};

export type StudioShellProps = {
  apiKeyConfigured: boolean;
  project: StudioShellProject;
};
