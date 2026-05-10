import type {
  ContentType,
  DocumentSegment,
  GlossaryEntry,
  LanguageConfig,
  LanguageCode,
  QAFinding,
  SegmentStatus,
} from '@/lib/domain';

export type PipelineStage = {
  label: string;
  status: SegmentStatus | 'running' | 'idle';
};

export type StudioShellProject = {
  title: string;
  contentType: ContentType;
  targetLanguage: LanguageConfig;
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
  sourceText: string;
  glossary: GlossaryEntry[];
};
