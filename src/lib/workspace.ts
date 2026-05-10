import type {
  ContentType,
  DocumentSegment,
  GlossaryEntry,
  LanguageConfig,
  LanguageCode,
  QAFinding,
  SegmentStatus,
  StyleProfile,
} from '@/lib/domain';

export type PipelineStage = {
  label: string;
  status: SegmentStatus | 'running' | 'idle';
};

export const segmentationStrategyValues = ['paragraph', 'scene_markers', 'hybrid'] as const;
export type SegmentationStrategy = (typeof segmentationStrategyValues)[number];

export type StudioShellProject = {
  title: string;
  contentType: ContentType;
  targetLanguage: LanguageConfig;
  styleProfile: StyleProfile;
  progress: number;
  segments: DocumentSegment[];
  glossary: GlossaryEntry[];
  qaFindings: QAFinding[];
  pipelineStages: PipelineStage[];
};

export type TranslationWorkspaceSeed = {
  projectId: string;
  title: string;
  contentType: ContentType;
  sourceLanguageCode: LanguageCode;
  targetLanguage: LanguageConfig;
  styleProfile: StyleProfile;
  sourceText: string;
  glossary: GlossaryEntry[];
  segmentationStrategy?: SegmentationStrategy;
};
