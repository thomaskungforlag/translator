import { buildDefaultStyleProfile } from './reference-material';
import {
  defaultContentType,
  defaultTargetLanguageCode,
  getTargetLanguageConfig,
} from './workspace-options';
import type { TranslationWorkspaceSeed } from './workspace';

export const initialWorkspaceSeed: TranslationWorkspaceSeed = {
  projectId: 'proj_new',
  title: 'Untitled project',
  contentType: defaultContentType,
  sourceLanguageCode: 'sv',
  segmentationStrategy: 'hybrid',
  targetLanguage: getTargetLanguageConfig(defaultTargetLanguageCode),
  styleProfile: buildDefaultStyleProfile(),
  sourceText: '',
  glossary: [],
};
