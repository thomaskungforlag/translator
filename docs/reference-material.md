# Reference Material

## Table of Contents

- [`RodTvilling.6x9.Hardcover.pdf`](#rodtvilling6x9hardcoverpdf)
- [`RodTvilling.English.pdf`](#rodtvillingenglishpdf)
- [Recommendation](#recommendation)
- [Practical Use In MVP](#practical-use-in-mvp)

## `RodTvilling.6x9.Hardcover.pdf`

- Use this as the canonical style guide and source-of-truth corpus.
- It is the full Swedish book, so it should drive:
  - voice analysis,
  - terminology extraction,
  - character and place-name consistency,
  - QA rules for rhythm, tone, and idiom.
- This is the file to consult when deciding whether the English output preserves the original author voice.

## `RodTvilling.English.pdf`

- Use this as a starting translation draft and translation-memory reference.
- It is much shorter than the Swedish source, so it appears to cover only the opening parts.
- It should not be treated as a gold-standard translation.
- It should be QA reviewed against the Swedish source before being reused in the app.

## Recommendation

- Build the app's default style profile from the Swedish PDF.
- Use the English PDF as a seed for draft reuse where segments overlap.
- Run QA on the English draft before trusting it in the pipeline.
- Prefer the Swedish PDF whenever there is a disagreement between the two.
- Treat the current repo integration as a style and terminology seed, not a full corpus-backed QA system yet.

## Practical Use In MVP

- Extract style cues from the Swedish corpus into the project's style guidance.
- Treat the English PDF as optional pretranslated content for early passes.
- Surface any reused English text as reviewable, not accepted.
