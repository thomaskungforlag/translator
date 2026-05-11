# Public Repo Checklist

Use this checklist before changing the GitHub repository visibility to public.

## Working Tree

- Confirm private source files are not present in the current tree.
- Confirm [docs/reference-material.md](./reference-material.md) still describes only the public-safe placeholder approach.
- Confirm any real local reference files live in gitignored locations such as `private/`.

## Git History

Removing files from the current tree is not enough if they were already committed earlier.

Before making the repo public:

1. Inspect history for private PDFs, manuscripts, or excerpts.
2. Rewrite history to remove those files if they were ever committed.
3. Force-push the cleaned history to GitHub.

Typical targets to purge:

- `docs/RodTvilling.6x9.Hardcover.pdf`
- `docs/RodTvilling.English.pdf`
- any other committed private corpora, drafts, or protected excerpts

Recommended tool:

- `git filter-repo`

Example approach:

```bash
git filter-repo --invert-paths \
  --path docs/RodTvilling.6x9.Hardcover.pdf \
  --path docs/RodTvilling.English.pdf
```

Then review the rewritten history carefully before pushing.

## Secrets

- Rotate `OPENAI_API_KEY` if it was ever committed.
- Rotate `POE_API_KEY` if it was ever committed.
- Rotate `WORDPRESS_TRANSLATION_API_KEY` if it was ever committed.
- Check GitHub Actions and deployment secrets separately.

## Final Verification

Run:

```bash
npm run repo:public-check
npm run verify
```

Optional extra checks:

```bash
git log --stat -- docs
git grep -n "private" HEAD
git ls-files | rg "\\.pdf$|\\.docx$|\\.epub$"
```

## Visibility Change

Only after the working tree, history, and secrets are clean:

1. Change the GitHub repository visibility to public.
2. Recheck the repository on GitHub, not just locally.
3. Confirm no release artifacts or old attachments expose protected material.
