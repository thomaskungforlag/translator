# Thomas Kung Author Translation Studio

## Table of Contents

- [Purpose](#purpose)
- [Product Vision](#product-vision)
- [Target User](#target-user)
- [Core Principle](#core-principle)
- [MVP Scope](#mvp-scope)
- [Recommended Tech Stack](#recommended-tech-stack)
  - [Frontend](#frontend)
  - [Backend](#backend)
  - [Document Handling](#document-handling)
  - [Storage](#storage)
- [Data Model](#data-model)
  - [Project](#project)
  - [DocumentSegment](#documentsegment)
  - [StyleProfile](#styleprofile)
  - [GlossaryEntry](#glossaryentry)
  - [QAFinding](#qafinding)
- [Translation Pipeline](#translation-pipeline)
  - [Pass 0: Source Preparation](#pass-0-source-preparation)
  - [Pass 1: Faithful Translation](#pass-1-faithful-translation)
  - [Pass 2: Voice Adaptation](#pass-2-voice-adaptation)
  - [Pass 3: Literary Polish](#pass-3-literary-polish)
  - [Pass 4: Language QA](#pass-4-language-qa)
  - [Pass 5: Fidelity QA](#pass-5-fidelity-qa)
  - [Pass 6: Style QA](#pass-6-style-qa)
  - [Pass 7: Final Assembly](#pass-7-final-assembly)
- [Style Profile: Thomas Kung Author Voice](#style-profile-thomas-kung-author-voice)
- [Prompt Pack](#prompt-pack)
  - [System Prompt for Translation Pipeline](#system-prompt-for-translation-pipeline)
  - [Faithful Translation Prompt](#faithful-translation-prompt)
  - [Voice Adaptation Prompt](#voice-adaptation-prompt)
  - [QA Prompt](#qa-prompt)
- [UI Layout](#ui-layout)
  - [Main Translation Screen](#main-translation-screen)
  - [Project Sidebar](#project-sidebar)
  - [Review Features](#review-features)
- [Quality Gates](#quality-gates)
- [Multi-Language Design](#multi-language-design)
- [Export Formats](#export-formats)
- [Backlog](#backlog)
- [Epic 1: Project Foundation](#epic-1-project-foundation)
  - [Task 1.1: Create Next.js App](#task-11-create-nextjs-app)
  - [Task 1.2: Create Core Types](#task-12-create-core-types)
  - [Task 1.3: Add Local Project Storage](#task-13-add-local-project-storage)
- [Epic 2: Text Input and Segmentation](#epic-2-text-input-and-segmentation)
  - [Task 2.1: Paste Text Input](#task-21-paste-text-input)
  - [Task 2.2: Segment Text](#task-22-segment-text)
  - [Task 2.3: Segment Editor](#task-23-segment-editor)
- [Epic 3: OpenAI Pipeline](#epic-3-openai-pipeline)
  - [Task 3.1: OpenAI Client Wrapper](#task-31-openai-client-wrapper)
  - [Task 3.2: Structured Output Schemas](#task-32-structured-output-schemas)
  - [Task 3.3: Pass 1 Faithful Translation](#task-33-pass-1-faithful-translation)
  - [Task 3.4: Pass 2 Voice Adaptation](#task-34-pass-2-voice-adaptation)
  - [Task 3.5: Pass 3 Literary Polish](#task-35-pass-3-literary-polish)
  - [Task 3.6: QA Passes](#task-36-qa-passes)
  - [Task 3.7: Final Assembly](#task-37-final-assembly)
- [Epic 4: Style Profile and Voice Preservation](#epic-4-style-profile-and-voice-preservation)
  - [Task 4.1: Default Thomas Kung Style Profile](#task-41-default-thomas-kung-style-profile)
  - [Task 4.2: Add Sample Texts](#task-42-add-sample-texts)
  - [Task 4.3: Avoid Patterns](#task-43-avoid-patterns)
- [Epic 5: Glossary and Terminology](#epic-5-glossary-and-terminology)
  - [Task 5.1: Glossary CRUD](#task-51-glossary-crud)
  - [Task 5.2: Glossary Candidate Detection](#task-52-glossary-candidate-detection)
  - [Task 5.3: Glossary QA](#task-53-glossary-qa)
- [Epic 6: Review UI](#epic-6-review-ui)
  - [Task 6.1: Side-by-Side Viewer](#task-61-side-by-side-viewer)
  - [Task 6.2: QA Findings Panel](#task-62-qa-findings-panel)
  - [Task 6.3: Manual Editing](#task-63-manual-editing)
- [Epic 7: Export](#epic-7-export)
  - [Task 7.1: Markdown Export](#task-71-markdown-export)
  - [Task 7.2: QA Report Export](#task-72-qa-report-export)
  - [Task 7.3: JSON Project Export](#task-73-json-project-export)
- [Epic 8: Future Improvements](#epic-8-future-improvements)
  - [Task 8.1: DOCX Import/Export](#task-81-docx-importexport)
  - [Task 8.2: Batch Chapter Translation](#task-82-batch-chapter-translation)
  - [Task 8.3: Cost Estimation](#task-83-cost-estimation)
  - [Task 8.4: Translation Memory](#task-84-translation-memory)
  - [Task 8.5: Human Review Mode](#task-85-human-review-mode)
  - [Task 8.6: Multi-Language Expansion](#task-86-multi-language-expansion)
- [Suggested Build Order for Codex](#suggested-build-order-for-codex)
- [Definition of Done for MVP](#definition-of-done-for-mvp)
- [Codex Starting Prompt](#codex-starting-prompt)
- [Important Design Notes](#important-design-notes)
- [Future North Star](#future-north-star)


## Purpose

Build a production-quality, multi-pass translation tool tailored to Thomas Kung’s author voice. The first target language is English, but the system must be designed so additional target languages can be added later without redesigning the core workflow.

The goal is not simply to translate text. The goal is to preserve literary voice, rhythm, tone, genre atmosphere, narrative clarity, character consistency, and market-ready prose quality while adding structured quality assurance for language, grammar, spelling, omissions, terminology, and stylistic drift.

---

## Product Vision

The app should help translate Swedish fiction and author material into polished English suitable for professional review, querying, marketing, publication preparation, or submission.

It should support:

- Multi-pass AI translation.
- Voice preservation based on Thomas Kung’s existing writing style.
- Glossary and terminology consistency.
- Character and worldbuilding consistency.
- Grammar, spelling, and language QA.
- Side-by-side review of source, drafts, critique, and final output.
- Export to Markdown now, with richer export formats later.
- Future support for other target languages.

---

## Target User

Primary user: Thomas Kung, Swedish sci-fi author.

Important traits:

- Writes fiction, especially sci-fi.
- Wants translations to retain his personal author voice.
- Needs literary quality, not generic machine translation.
- Needs reviewable output rather than a black-box final answer.
- Likely works with chapters, excerpts, website copy, blurbs, newsletters, and social posts.

---

## Core Principle

The app should treat translation as an editorial pipeline, not a single model call.

Each text segment should pass through multiple specialized stages:

1. Source analysis.
2. Faithful translation.
3. Voice adaptation.
4. Literary polish.
5. QA review.
6. Final market-quality output.

Every stage should be inspectable.

---

## MVP Scope

The MVP should support:

- Paste or upload Swedish text.
- Target English first, while keeping the data model open to more languages later.
- Start with the seeded content type and language controls already present in the UI.
- Run a multi-pass translation pipeline.
- Show source analysis, faithful draft, voice draft, polish draft, final output, and QA findings.
- Show QA findings separately.
- Allow source-text editing and manual copy/paste review.
- Export final translation as Markdown.
- Import plain text or Markdown.
- Make degraded fallback mode explicit when OpenAI is unavailable or fails.

Out of scope for MVP:

- Full manuscript management.
- Collaborative editing.
- Payment/authentication.
- Publisher-ready layout.
- Full CAT-tool functionality.
- Local persistence beyond copy/paste plus import/export.
- DOCX import/export.

---

## Recommended Tech Stack

### Frontend

- Next.js
- TypeScript
- React
- MUI
- Small client components with typed props and minimal shared state

### Backend

- Next.js API routes or server actions
- OpenAI API
- Zod for schema validation
- No database in the first MVP slice

### Document Handling

MVP:

- Plain text
- Markdown

Later:

- DOCX import/export
- EPUB parsing
- JSON manuscript format

### Storage

MVP:

- Copy/paste workflow
- Text and Markdown import
- Markdown export

Later:

- Local project persistence if the review workflow proves it is necessary
- Postgres or Supabase if multi-project storage becomes a real product need

---

## Data Model

### Project

```ts
type Project = {
  id: string;
  title: string;
  sourceLanguage: string;
  targetLanguage: string;
  contentType: ContentType;
  createdAt: string;
  updatedAt: string;
  styleProfileId?: string;
  glossaryId?: string;
};
```

### DocumentSegment

```ts
type DocumentSegment = {
  id: string;
  projectId: string;
  index: number;
  sourceText: string;
  sourceAnalysis: string;
  sourceNotes?: string;
  translationDraft?: string;
  voiceAdaptedDraft?: string;
  polishedDraft?: string;
  finalText?: string;
  qaFindings?: QAFinding[];
  status: 'pending' | 'translated' | 'reviewed' | 'approved';
};
```

### StyleProfile

```ts
type StyleProfile = {
  id: string;
  name: string;
  description: string;
  voicePrinciples: string[];
  preferredTone: string[];
  avoidPatterns: string[];
  sentenceRhythmNotes: string[];
  genreNotes: string[];
  sampleTexts: StyleSample[];
};
```

### GlossaryEntry

```ts
type GlossaryEntry = {
  id: string;
  sourceTerm: string;
  targetTerm: string;
  category: 'character' | 'place' | 'technology' | 'worldbuilding' | 'phrase' | 'other';
  notes?: string;
  locked: boolean;
};
```

### QAFinding

```ts
type QAFinding = {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  category:
    | 'omission'
    | 'mistranslation'
    | 'grammar'
    | 'spelling'
    | 'style_drift'
    | 'terminology'
    | 'character_voice'
    | 'market_quality'
    | 'formatting';
  sourceExcerpt?: string;
  targetExcerpt?: string;
  issue: string;
  suggestion?: string;
  resolved: boolean;
};
```

---

## Translation Pipeline

### Pass 0: Source Preparation

Purpose:

- Normalize text.
- Preserve paragraph breaks.
- Split into stable segments.
- Detect dialogue, names, places, invented words, and genre-specific terminology.

Output:

- Segmented source text.
- Source analysis notes for translation and QA review.

Prompt role:

> Analyze the source text for translation. Identify tone, narrator perspective, genre signals, emotional atmosphere, dialogue style, unusual terminology, names, invented terms, and any risks for translation.

---

### Pass 1: Faithful Translation

Purpose:

- Translate accurately.
- Preserve meaning, events, references, paragraph structure, and dialogue.
- Avoid over-polishing.

Rules:

- Do not omit meaning.
- Do not add new content.
- Preserve ambiguity when the original is ambiguous.
- Preserve paragraphing.
- Keep glossary terms consistent.

Output:

- Literal but readable target-language draft.

---

### Pass 2: Voice Adaptation

Purpose:

- Adapt the translated draft to Thomas Kung’s author voice.
- Preserve mood, pacing, imagery, sentence rhythm, restraint, and genre texture.

Rules:

- Do not make the prose generic.
- Do not flatten atmosphere.
- Do not over-Americanize unless requested.
- Preserve character voices.
- Keep speculative/science-fiction tone intact.

Output:

- Voice-aligned translation draft.

---

### Pass 3: Literary Polish

Purpose:

- Improve fluency, readability, elegance, and market quality.
- Make prose feel originally written in English.

Rules:

- Keep the author’s style.
- Avoid cliché.
- Avoid overwriting.
- Preserve tension and subtext.
- Improve rhythm only where needed.

Output:

- Polished literary draft.

---

### Pass 4: Language QA

Purpose:

Check:

- Grammar.
- Spelling.
- Punctuation.
- Awkward phrasing.
- False friends.
- Swedishisms.
- Dialogue punctuation.
- Idiom quality.

Output:

- List of findings.
- Suggested corrections.
- Optional corrected draft.

---

### Pass 5: Fidelity QA

Purpose:

Compare source and target.

Check:

- Missing sentences or ideas.
- Added meaning.
- Changed facts.
- Changed emotional tone.
- Changed character intent.
- Mistranslated names, places, terms, or chronology.

Output:

- Critical fidelity findings.
- Suggested changes.

---

### Pass 6: Style QA

Purpose:

Check against Thomas Kung’s style profile.

Check:

- Does the text still sound like Thomas Kung?
- Has the translation become too generic?
- Has sentence rhythm changed too much?
- Are metaphors and atmosphere preserved?
- Are character voices consistent?
- Is the sci-fi tone intact?

Output:

- Style drift findings.
- Suggested improvements.

---

### Pass 7: Final Assembly

Purpose:

- Apply approved fixes.
- Produce final market-quality translation.
- Preserve formatting.
- Generate optional translator/editor notes.

Output:

- Final translated text.
- QA summary.
- Optional unresolved issues.

---

## Style Profile: Thomas Kung Author Voice

This should be editable inside the app.

Initial placeholder profile:

```md
Thomas Kung’s author voice should be treated as literary, speculative, atmospheric, and clear. The translation should preserve emotional tension, sci-fi concepts, character intimacy, and narrative rhythm. Avoid making the prose sound like generic commercial thriller copy unless explicitly requested. Prefer precise, vivid prose over inflated language. Preserve restraint, mood, and subtext.
```

The app should allow Thomas to add:

- Swedish source samples.
- Approved English translations.
- Notes about preferred wording.
- Rejected wording examples.
- Character voice notes.
- Series/world terminology.

---

## Prompt Pack

### System Prompt for Translation Pipeline

```txt
You are a professional literary translator, bilingual editor, and fiction QA reviewer. Your task is to translate and refine texts by Swedish author Thomas Kung while preserving his author voice, genre tone, narrative rhythm, character voices, and meaning.

You must never treat translation as a generic rewrite. You must preserve the author’s intent, ambiguity, atmosphere, emotional subtext, paragraph structure, and speculative-fiction terminology.

When uncertain, flag the issue rather than silently changing meaning.
```

### Faithful Translation Prompt

```txt
Translate the following Swedish text into English.

Priorities:
1. Preserve meaning exactly.
2. Preserve paragraph structure.
3. Preserve dialogue and speaker intent.
4. Preserve names, places, invented terms, and worldbuilding.
5. Do not add or omit content.
6. Use natural English, but do not over-polish yet.

Return only the translated text unless the schema asks for notes.
```

### Voice Adaptation Prompt

```txt
Revise the English translation so it better preserves Thomas Kung’s author voice.

Use the provided style profile, glossary, source text, and faithful translation.

Improve:
- Narrative rhythm.
- Atmosphere.
- Character voice.
- Literary flow.
- Sci-fi tone.
- Emotional subtext.

Do not:
- Add new meaning.
- Remove ambiguity.
- Flatten the prose.
- Make the language generic.
- Overwrite restrained passages.
```

### QA Prompt

```txt
Compare the Swedish source and English translation.

Find issues in these categories:
- omission
- mistranslation
- grammar
- spelling
- punctuation
- terminology
- style drift
- character voice
- market quality
- formatting

For each issue, provide:
- severity
- category
- source excerpt
- target excerpt
- explanation
- suggested fix

Be strict but practical. Focus on issues that matter for publication-quality prose.
```

---

## UI Layout

### Main Translation Screen

Left column:

- Source text.
- Segment list.
- Glossary highlights.

Center column:

- Current translated draft.
- Toggle between passes:
  - Faithful.
  - Voice adapted.
  - Polished.
  - Final.

Right column:

- QA findings.
- Glossary suggestions.
- Style warnings.
- Accept/reject controls.

### Project Sidebar

- Projects.
- Documents.
- Style profiles.
- Glossaries.
- Export options.

### Review Features

- Accept suggestion.
- Reject suggestion.
- Edit final text manually.
- Mark segment as approved.
- Re-run selected pass for one segment.
- Lock user-edited text from overwrite.

---

## Quality Gates

A segment should not be marked final if:

- Any critical omission exists.
- Any glossary-locked term is inconsistent.
- Source and target paragraph counts differ unexpectedly.
- QA detects unresolved grammar or spelling issues.
- Style QA marks severe voice drift.

The app can still allow override, but should show a warning.

---

## Multi-Language Design

English is the first target language, but the pipeline should use language configuration files.

Example:

```ts
type LanguageConfig = {
  code: string;
  label: string;
  locale: string;
  translationNotes: string[];
  dialogueRules: string[];
  punctuationRules: string[];
  marketQualityNotes: string[];
};
```

For English:

- Choose default variant: English, international literary style.
- Optional variants later:
  - US English.
  - UK English.
  - International English.

Future target languages should add:

- Punctuation conventions.
- Dialogue conventions.
- Formality handling.
- Genre-market expectations.
- Known pitfalls from Swedish.

---

## Export Formats

MVP:

- Markdown.
- Plain text.
- JSON project export.

Later:

- DOCX.
- EPUB draft.
- CSV glossary.
- QA report PDF.

---

## Backlog

## Epic 1: Project Foundation

### Task 1.1: Create Next.js App

Set up a Next.js TypeScript project with Tailwind and shadcn/ui.

Acceptance criteria:

- App runs locally.
- TypeScript strict mode enabled.
- Basic layout exists.
- Environment variable support for OpenAI API key.

### Task 1.2: Create Core Types

Implement TypeScript types for project, segment, style profile, glossary, QA findings, and language config.

Acceptance criteria:

- Types are centralized.
- Types are used by frontend and backend.
- Zod schemas exist for API validation.

### Task 1.3: Add Local Project Storage

Implement simple local JSON or SQLite project persistence.

Acceptance criteria:

- User can create a project.
- User can reopen a project.
- Segments and settings persist.

---

## Epic 2: Text Input and Segmentation

### Task 2.1: Paste Text Input

Create an input screen for source text.

Acceptance criteria:

- User can paste Swedish text.
- User can select content type.
- User can select target language.

### Task 2.2: Segment Text

Split pasted text into paragraph-based segments with stable IDs.

Acceptance criteria:

- Paragraph breaks are preserved.
- Empty lines are handled correctly.
- Segments can be reassembled in original order.

### Task 2.3: Segment Editor

Allow manual editing of source segments before translation.

Acceptance criteria:

- User can edit a segment.
- Segment changes persist.
- Reassembly still works.

---

## Epic 3: OpenAI Pipeline

### Task 3.1: OpenAI Client Wrapper

Create a server-side OpenAI client wrapper.

Acceptance criteria:

- API key is server-only.
- Errors are handled cleanly.
- Requests and responses are logged without leaking secrets.

### Task 3.2: Structured Output Schemas

Create Zod/JSON schemas for each pass response.

Acceptance criteria:

- Translation responses validate.
- QA responses validate.
- Invalid responses retry or fail gracefully.

### Task 3.3: Pass 1 Faithful Translation

Implement faithful translation for one segment.

Acceptance criteria:

- Source segment translates to English.
- Paragraph structure is preserved.
- Glossary terms are passed into the prompt.

### Task 3.4: Pass 2 Voice Adaptation

Implement voice adaptation pass.

Acceptance criteria:

- Uses style profile.
- Uses source and faithful translation.
- Produces revised draft.

### Task 3.5: Pass 3 Literary Polish

Implement polish pass.

Acceptance criteria:

- Produces polished draft.
- Does not intentionally change meaning.
- Stores output separately from earlier drafts.

### Task 3.6: QA Passes

Implement language, fidelity, and style QA.

Acceptance criteria:

- QA findings are structured.
- Each issue has severity, category, explanation, and suggestion.
- Critical issues block auto-approval.

### Task 3.7: Final Assembly

Generate final text from polished draft and accepted QA changes.

Acceptance criteria:

- Final text is stored separately.
- User edits are preserved.
- Final export is possible.

---

## Epic 4: Style Profile and Voice Preservation

### Task 4.1: Default Thomas Kung Style Profile

Create an editable default author style profile.

Acceptance criteria:

- Style profile loads by default.
- User can edit voice principles.
- Profile is included in relevant prompts.

### Task 4.2: Add Sample Texts

Allow Thomas to add source samples and approved translations.

Acceptance criteria:

- Samples are stored with profile.
- Samples can be included in prompts.
- User can mark samples as high priority.

### Task 4.3: Avoid Patterns

Add a list of phrases or tendencies to avoid.

Acceptance criteria:

- Avoid patterns are editable.
- Avoid patterns are sent to voice and QA passes.
- QA can flag avoid-pattern violations.

---

## Epic 5: Glossary and Terminology

### Task 5.1: Glossary CRUD

Create glossary management UI.

Acceptance criteria:

- User can add, edit, delete terms.
- Terms can be locked.
- Terms have categories and notes.

### Task 5.2: Glossary Candidate Detection

Detect likely terms from source text.

Acceptance criteria:

- Names, places, technologies, and repeated unusual terms are suggested.
- User can approve candidates into glossary.

### Task 5.3: Glossary QA

Check final text against locked glossary terms.

Acceptance criteria:

- Locked terms must match target terms.
- Inconsistencies produce QA findings.

---

## Epic 6: Review UI

### Task 6.1: Side-by-Side Viewer

Create source/translation comparison UI.

Acceptance criteria:

- Source and target are visible together.
- User can switch between draft passes.
- Current segment is highlighted.

### Task 6.2: QA Findings Panel

Display QA findings for selected segment.

Acceptance criteria:

- Findings are grouped by severity.
- User can accept, reject, or resolve each finding.
- Resolved state persists.

### Task 6.3: Manual Editing

Allow user to edit final text manually.

Acceptance criteria:

- Manual edits persist.
- Edited segment can be locked.
- Re-running AI does not overwrite locked text without confirmation.

---

## Epic 7: Export

### Task 7.1: Markdown Export

Export final translation as Markdown.

Acceptance criteria:

- Segment order is preserved.
- Paragraph breaks are preserved.
- File downloads correctly.

### Task 7.2: QA Report Export

Export QA findings as Markdown.

Acceptance criteria:

- Includes unresolved findings.
- Includes project metadata.
- Includes summary by category and severity.

### Task 7.3: JSON Project Export

Export full project as JSON.

Acceptance criteria:

- Includes source, drafts, final, glossary, style profile, and QA.
- Can be re-imported later.

---

## Epic 8: Future Improvements

### Task 8.1: DOCX Import/Export

Support manuscript workflows.

### Task 8.2: Batch Chapter Translation

Run translation across multiple chapters.

### Task 8.3: Cost Estimation

Estimate token usage before running.

### Task 8.4: Translation Memory

Reuse approved translations for repeated phrases and terms.

### Task 8.5: Human Review Mode

Add comments, notes, and editor-style review status.

### Task 8.6: Multi-Language Expansion

Add target-language profiles for German, French, Spanish, etc.

---

## Suggested Build Order for Codex

1. Scaffold Next.js app.
2. Add core types and schemas.
3. Build paste/segment/reassemble flow.
4. Add OpenAI client wrapper.
5. Implement single-segment faithful translation.
6. Add voice adaptation pass.
7. Add QA pass.
8. Build side-by-side review UI.
9. Add glossary.
10. Add style profile.
11. Add export.
12. Add batch translation.

---

## Definition of Done for MVP

The MVP is complete when Thomas can:

1. Create a translation project.
2. Paste a Swedish excerpt.
3. Segment it automatically.
4. Run a multi-pass English translation.
5. Review QA findings.
6. Edit and approve final text.
7. Export the final translation as Markdown.
8. Preserve a reusable Thomas Kung style profile and glossary.

---

## Codex Starting Prompt

Use this prompt to start the project in Codex:

```txt
Build a Next.js TypeScript application called Thomas Kung Author Translation Studio.

The app is a production-quality multi-pass literary translation tool for Swedish author Thomas Kung. It should translate Swedish fiction and author material into market-quality English while preserving the author’s voice, genre tone, character voice, rhythm, meaning, and formatting.

Use the attached project plan as the source of truth.

Start with the MVP:
- Next.js TypeScript app.
- Tailwind and shadcn/ui.
- Project creation.
- Paste Swedish text.
- Paragraph segmentation with stable IDs.
- OpenAI server-side client wrapper.
- Multi-pass pipeline for one segment: faithful translation, voice adaptation, literary polish, QA.
- Side-by-side review UI.
- Editable style profile.
- Basic glossary.
- Markdown export.

Prioritize clean architecture, typed schemas, inspectable intermediate outputs, and safe handling of user edits.

Do not build authentication, payments, or complex manuscript management yet.
```

---

## Important Design Notes

- Never overwrite user-edited final text without confirmation.
- Keep all intermediate drafts.
- Make QA visible and actionable.
- Treat style preservation as a first-class feature.
- Use structured outputs wherever possible.
- Keep target language configurable from the start.
- Make glossary terms explicit and locked where needed.
- Prefer transparent editorial workflow over hidden automation.

---

## Future North Star

Eventually this could become a private literary translation workbench for Thomas Kung’s author universe: a place where manuscripts, characters, invented terminology, tone, worldbuilding, blurbs, and translations live together and improve over time.
