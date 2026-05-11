# Deployment

This project is set up to deploy on Vercel as a standard Next.js application.

## Why This Setup

- Next.js is auto-detected by Vercel, so no custom build pipeline is needed.
- The translation API routes can run longer than a trivial page request, so [vercel.json](../vercel.json) sets `maxDuration` to `60` seconds for:
  - `/api/translate`
  - `/api/wordpress/translate-page`
- Node is pinned in [package.json](../package.json) to `22.x` for predictable builds instead of floating to whatever the latest Vercel default is.

## Required Environment Variables

Set these in Vercel Project Settings for the environments you use:

- `AI_PROVIDER`
  - `openai` or `poe`
- `OPENAI_API_KEY`
  - required when `AI_PROVIDER=openai`
- `OPENAI_MODEL`
  - optional override, default in code is `gpt-5-mini`
- `POE_API_KEY`
  - required when `AI_PROVIDER=poe`
- `POE_BOT`
  - optional when `AI_PROVIDER=poe`
- `POE_API_URL`
  - optional when `AI_PROVIDER=poe`
- `REFERENCE_SOURCE_PDF_URL`
  - optional runtime URL for the Swedish source/style reference PDF
- `REFERENCE_DRAFT_PDF_URL`
  - optional runtime URL for the English draft/reference PDF
- `WORDPRESS_TRANSLATION_API_KEY`
  - required if the WordPress plugin will call this deployment

You can use different values for Preview and Production. In practice:

- Preview usually uses non-production provider keys or a safer test bot
- Production uses the real provider keys and the real WordPress translation key
- If you want the deployed app to use your book PDFs for prompt enrichment, set the two `REFERENCE_*_PDF_URL` vars in Vercel instead of committing the PDFs into the repo.

## Reference PDF Runtime Loading

- The app can fetch remote reference PDFs at runtime and extract prompt excerpts server-side.
- Public Google Drive file links work for this because the app rewrites `drive.google.com/file/d/.../view` URLs into direct download URLs automatically.
- Example acceptable value:
  - `https://drive.google.com/file/d/17II_a5abZ9Ocgw6iB-5FwWXVVaucaml_/view?usp=sharing`
- The app still works without these vars; it falls back to the checked-in placeholder reference seed.
- Keep in mind that if the Drive links are publicly accessible, anyone with the link can fetch the files. That is fine only if that matches your risk tolerance.

## Vercel Scripts

Use these scripts from the repo root:

- `npm run vercel:link`
  - links the local repo to a Vercel project
- `npm run vercel:pull`
  - pulls Vercel environment variables into `.env.local`
- `npm run vercel:deploy`
  - creates a preview deployment
- `npm run vercel:deploy:prod`
  - creates a production deployment

## First-Time Setup

1. Create or import the repository in Vercel.
2. Confirm the framework is detected as `Next.js`.
3. Set the project Root Directory to the repo root if Vercel asks.
4. Add the required environment variables in Vercel.
5. Run `npm run vercel:link`.
6. Run `npm run vercel:pull` if you want local env parity with Vercel.
7. Run `npm run vercel:deploy` for a preview deployment.
8. When ready, run `npm run vercel:deploy:prod` or promote through the Vercel dashboard.

## WordPress Plugin Note

If you are using the WordPress plugin from [packages/wordpress-plugin/README.md](../packages/wordpress-plugin/README.md):

- set the plugin `Service Base URL` to the deployed Vercel domain
- do not include `/api/wordpress/translate-page`
- keep the plugin `Service API Key` identical to `WORDPRESS_TRANSLATION_API_KEY`

Example:

- Vercel deployment URL: `https://translator.example.vercel.app`
- WordPress `Service Base URL`: `https://translator.example.vercel.app`

## Notes

- The app already has the required `build` and `start` scripts for Node.js deployment.
- Vercel auto-detects install/build commands for npm projects with a `package-lock.json`.
- `.vercelignore` excludes local artifacts, env files, and plugin test files from CLI uploads.
