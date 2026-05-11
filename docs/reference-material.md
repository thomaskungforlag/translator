# Reference Material

## Public Repo Rule

This public repository must not contain:

- unpublished manuscripts
- book PDFs
- private translation drafts
- derived translation-memory excerpts from private works
- private glossary exports or style notes that expose protected text

The checked-in reference layer is intentionally public-safe and uses placeholder material only.

## What Stays In Git

Safe to keep in the public repo:

- generic style-profile structure
- generic QA rules
- placeholder glossary terms
- placeholder translation-memory examples created for demos and tests
- code that loads or formats private reference material

## What Must Live Outside Git

Keep private source/reference material in one of these places instead:

- authenticated WordPress endpoint
- private object storage
- private database
- private local files ignored by git
- separate private repository

Do not use a public CDN for material that is not already intentionally public.

## Current Repo Behavior

- [reference-material.ts](../src/lib/reference-material.ts) contains a public-safe placeholder corpus.
- [reference-material-runtime.ts](../src/lib/reference-material-runtime.ts) can optionally fetch real reference PDFs at runtime from env-configured URLs.
- The app and plugin are built to work without embedding real manuscripts in the repository.
- Real author/reference content should be injected separately at runtime or maintained in private storage.

## Vercel + Runtime PDFs

If you want a public repo and a hosted Vercel deployment while still using real reference PDFs:

- keep the PDFs out of git
- set `REFERENCE_SOURCE_PDF_URL` in Vercel to the Swedish PDF URL
- optionally set `REFERENCE_DRAFT_PDF_URL` in Vercel to the English draft PDF URL
- let the server fetch and extract those PDFs at runtime

This keeps the code public while still allowing prompt enrichment from your reference documents.

## Suggested Local Pattern

If you still want local private notes or corpora on your machine:

- keep them in a gitignored directory such as `private/`
- or copy [private-reference-material.template.md](private-reference-material.template.md) to a private local file and fill it in outside version control

## Recommendation

- Treat the checked-in corpus as a placeholder only.
- Move real author/source material to authenticated private storage.
- Keep the public repo focused on product code, tests, deployment, and plugin logic.
