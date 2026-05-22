import {
  getLanguageLabel,
  getLanguageLocale,
  type ContentType,
  type LanguageCode,
  type LanguageConfig,
} from './domain';

export type ContentTypeOption = {
  value: ContentType;
  label: string;
};

export const contentTypeOptions = [
  { value: 'novel_chapter', label: 'Novel chapter' },
  { value: 'short_story', label: 'Short story' },
  { value: 'blurb', label: 'Blurb' },
  { value: 'website_copy', label: 'Website copy' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'social_post', label: 'Social post' },
] satisfies ContentTypeOption[];

export type TargetLanguageOption = LanguageConfig;

export const defaultContentType: ContentType = 'novel_chapter';
export const defaultTargetLanguageCode: LanguageCode = 'en';

function buildTargetLanguageConfig(code: LanguageCode): LanguageConfig {
  const label = getLanguageLabel(code);
  const locale = getLanguageLocale(code);
  const isEnglishVariant = code === 'en' || code === 'en-GB' || code === 'en-US';

  return {
    code,
    label,
    locale,
    translationNotes: [
      isEnglishVariant
        ? 'Use literary English that reads naturally for the selected variant.'
        : `Translate into ${label} with idiomatic, market-ready prose.`,
      'Preserve terminology, voice, and narrative rhythm.',
      'Keep paragraph structure stable across all passes.',
    ],
    dialogueRules: [
      isEnglishVariant
        ? `Preserve punctuation conventions for ${label}.`
        : `Apply dialogue conventions that read naturally in ${label}.`,
    ],
    punctuationRules: ['Keep punctuation consistent with the target-language norm.'],
    marketQualityNotes: [
      `Aim for publication-ready ${label} while keeping the translation traceable.`,
    ],
  };
}

export const targetLanguageOptions: TargetLanguageOption[] = (
  ['sv', 'en', 'en-GB', 'en-US', 'de', 'fr', 'es'] as LanguageCode[]
).map((code) => buildTargetLanguageConfig(code));

export function getTargetLanguageConfig(code: LanguageCode): LanguageConfig {
  return (
    targetLanguageOptions.find((option) => option.code === code) ?? buildTargetLanguageConfig(code)
  );
}
