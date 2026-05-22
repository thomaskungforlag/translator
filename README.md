# Thomas Kung Author Translation Studio

Next.js + TypeScript + MUI workbench for an inspectable multi-pass literary translation workflow.

<!-- TOC-START -->

### Documentation

- [architecture](/docs/architecture.md)
- [deployment](/docs/deployment.md)
- [packages-wordpress-plugin](/packages/wordpress-plugin/README.md)
- [public-repo-checklist](/docs/public-repo-checklist.md)
- [reference-material](/docs/reference-material.md)
- [standards](/docs/standards.md)
- [testing](/docs/testing.md)
- [thomas_kung_translation_app_plan](/docs/thomas_kung_translation_app_plan.md)

### Main Sections

- [Start Here](#start-here)
- [Setup](#setup)
- [Code Map](#code-map)
- [Standards](#standards)
- [Scripts](#scripts)
<!-- TOC-END -->

## Start Here

If you are new to the repo, read these in order:

1. [docs/architecture.md](docs/architecture.md) for the codebase shape and boundaries.
2. [docs/standards.md](docs/standards.md) for the TypeScript, ESLint, Prettier, and SOC rules.
3. [docs/testing.md](docs/testing.md) for the TDD and browser-testing workflow.
4. [docs/deployment.md](docs/deployment.md) for Vercel deployment and environment setup.
5. [docs/reference-material.md](docs/reference-material.md) for how private reference material should be handled outside the public repo.
6. [docs/public-repo-checklist.md](docs/public-repo-checklist.md) before making the repository public.
7. [docs/thomas_kung_translation_app_plan.md](docs/thomas_kung_translation_app_plan.md) for the product plan.
8. [packages/wordpress-plugin/README.md](packages/wordpress-plugin/README.md) for the WordPress + Polylang integration package.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `AI_PROVIDER` to `openai` or `poe`.
3. If `AI_PROVIDER=openai`, set `OPENAI_API_KEY`.
4. If `AI_PROVIDER=poe`, set `POE_API_KEY` and optionally `POE_BOT`.
5. The app now loads live model lists from OpenAI and Poe when possible and lets you pick
   provider + model in the UI.
6. Optionally set `OPENAI_MODEL` or `POE_BOT` if you want a default selection before the live
   picker finishes loading. The code defaults to `gpt-5-mini` for OpenAI and
   `Claude-Sonnet-4.5` for Poe.
7. Optionally set `REFERENCE_SOURCE_PDF_URL` to a runtime-accessible Swedish reference PDF.
8. Optionally set `REFERENCE_DRAFT_PDF_URL` to a runtime-accessible English draft/reference PDF.
9. Set `WORDPRESS_TRANSLATION_API_KEY` if you want to enable the WordPress plugin route.
10. Run `npm run dev`.

If you are using the WordPress plugin:

- In WordPress, configure `Settings -> Thomas Kung Translator`.
- Set `Service Base URL` to the base host of this app, not the full route.
- The plugin appends `/api/wordpress/translate-page` automatically.
- Set `Service API Key` to the same value as `WORDPRESS_TRANSLATION_API_KEY`.
- `Default Source Language` is used if the source page has not yet been assigned a Polylang language.
- Build the installable plugin ZIP with `npm run plugin:wordpress:package`.
- Run the full release-prep flow with `npm run plugin:wordpress:release`.

If you are deploying on Vercel:

- follow [docs/deployment.md](docs/deployment.md)
- set the required environment variables in Vercel Project Settings
- if you want runtime reference enrichment, set `REFERENCE_SOURCE_PDF_URL` and optionally `REFERENCE_DRAFT_PDF_URL`
- use `npm run vercel:link`, `npm run vercel:pull`, `npm run vercel:deploy`, and `npm run vercel:deploy:prod`

## Code Map

- [src/app/layout.tsx](src/app/layout.tsx) sets up the App Router shell, fonts, metadata, and MUI cache.
- [src/app/page.tsx](src/app/page.tsx) is the route-based landing page and navigation hub.
- [src/app/proofreading/page.tsx](src/app/proofreading/page.tsx) hosts the dedicated proofreading route.
- [src/app/translate/page.tsx](src/app/translate/page.tsx) hosts the dedicated translation route.
- [src/components/app-shell.tsx](src/components/app-shell.tsx) is the shared top-level navigation shell.
- [src/components/studio-shell.tsx](src/components/studio-shell.tsx) is the translation dashboard coordinator.
- [src/components/studio-shell/](src/components/studio-shell) holds the small dashboard panels and review widgets.
- [src/lib/domain.ts](src/lib/domain.ts) defines the domain types and Zod schemas.
- [src/lib/translation.ts](src/lib/translation.ts) orchestrates provider responses into the app's project shape.
- [src/app/api/translate/route.ts](src/app/api/translate/route.ts) exposes the translation pipeline endpoint.
- [src/app/api/wordpress/translate-page/route.ts](src/app/api/wordpress/translate-page/route.ts) exposes the shared WordPress translation endpoint with service-key auth.
- [src/lib/wordpress-translation.ts](src/lib/wordpress-translation.ts) maps WordPress content units into the existing multi-pass translation pipeline.
- [src/lib/reference-material-runtime.ts](src/lib/reference-material-runtime.ts) optionally fetches remote PDF references at runtime and injects relevant excerpts into the prompt context.
- [packages/wordpress-plugin/](packages/wordpress-plugin) contains the Polylang-backed WordPress plugin package.
- [packages/wordpress-plugin/README.md](packages/wordpress-plugin/README.md) documents the WordPress settings page, endpoint configuration, editor flow, and current limitations.
- [docs/reference-material.md](docs/reference-material.md) explains the public-safe placeholder corpus and where private reference material should live instead.
- [eslint.config.mjs](eslint.config.mjs) defines the enforced code-quality rules.
- [jest.config.ts](jest.config.ts) configures unit tests.
- [playwright.config.ts](playwright.config.ts) configures browser tests.
- [vercel.json](vercel.json) configures Vercel function durations for the translation routes.

## Standards

This repo is intentionally strict so new code stays readable and testable:

- TypeScript is the default, with typed domain models in [src/lib/domain.ts](src/lib/domain.ts).
- ESLint is enforced in flat config with complexity, depth, length, and parameter limits in [eslint.config.mjs](eslint.config.mjs).
- Prettier is the formatting source of truth.
- Components should stay small and focused; use coordinator components plus leaf panels instead of large monoliths.
- TDD is the default approach: write or update tests alongside behavior changes.
- Jest covers unit and component logic.
- PHP plugin logic is covered by the lightweight runner in [packages/wordpress-plugin/tests/run.php](packages/wordpress-plugin/tests/run.php).
- Playwright covers browser flows and smoke tests.
- The translation endpoint can fall back to a local demo pipeline if OpenAI is unavailable.
- Demo fallback output is for degraded-mode inspection only, not production translation use.
- The current checked-in reference integration is a public-safe style and terminology seed, not a private corpus-backed QA system.

## Scripts

- `npm run dev` - start the development server
- `npm run lint` - run ESLint
- `npm run typecheck` - run the TypeScript compiler
- `npm run plugin:wordpress:php-lint` - run PHP syntax checks for the WordPress plugin
- `npm run plugin:wordpress:package` - build the WordPress plugin ZIP and SHA256 checksum
- `npm run plugin:wordpress:release` - run verification and then build the WordPress plugin release ZIP
- `npm run test:unit` - run Jest unit tests
- `npm run test:wordpress` - run the WordPress plugin PHP tests
- `npm run test:e2e` - run Playwright browser tests
- `npm run repo:public-check` - audit tracked files and git history for known private-source paths before making the repo public
- `npm run vercel:link` - link the repo to a Vercel project
- `npm run vercel:pull` - pull Vercel environment variables into `.env.local`
- `npm run vercel:deploy` - create a Vercel preview deployment
- `npm run vercel:deploy:prod` - create a Vercel production deployment
- `npm run build` - build for production
- `npm run verify` - run lint, typecheck, format check, unit tests, and build
