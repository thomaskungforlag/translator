# Thomas Kung Author Translation Studio

Next.js + TypeScript + MUI workbench for an inspectable multi-pass literary translation workflow.

<!-- TOC-START -->

### Documentation

- [architecture](/docs/architecture.md)
- [packages-wordpress-plugin](/packages/wordpress-plugin/README.md)
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
4. [docs/reference-material.md](docs/reference-material.md) for how the Röd Tvilling PDFs should be used.
5. [docs/thomas_kung_translation_app_plan.md](docs/thomas_kung_translation_app_plan.md) for the product plan.
6. [packages/wordpress-plugin/README.md](packages/wordpress-plugin/README.md) for the WordPress + Polylang integration package.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `AI_PROVIDER` to `openai` or `poe`.
3. If `AI_PROVIDER=openai`, set `OPENAI_API_KEY`.
4. If `AI_PROVIDER=poe`, set `POE_API_KEY` and optionally `POE_BOT`.
5. Optionally set `OPENAI_MODEL` if you want to override the default OpenAI model.
   The code defaults to `gpt-5-mini` because it is the best cost-quality
   starting point for the explicit multi-pass translation pipeline. Use
   `gpt-5.1` if you want to spend more for maximum output quality, or
   `gpt-4.1` if you want a non-reasoning alternative.
6. Set `WORDPRESS_TRANSLATION_API_KEY` if you want to enable the WordPress plugin route.
7. Run `npm run dev`.

## Code Map

- [src/app/layout.tsx](src/app/layout.tsx) sets up the App Router shell, fonts, metadata, and MUI cache.
- [src/components/studio-shell.tsx](src/components/studio-shell.tsx) is the top-level UI coordinator.
- [src/components/studio-shell/](src/components/studio-shell) holds the small dashboard panels and review widgets.
- [src/lib/domain.ts](src/lib/domain.ts) defines the domain types and Zod schemas.
- [src/lib/translation.ts](src/lib/translation.ts) orchestrates provider responses into the app's project shape.
- [src/app/api/translate/route.ts](src/app/api/translate/route.ts) exposes the translation pipeline endpoint.
- [src/app/api/wordpress/translate-page/route.ts](src/app/api/wordpress/translate-page/route.ts) exposes the shared WordPress translation endpoint with service-key auth.
- [src/lib/wordpress-translation.ts](src/lib/wordpress-translation.ts) maps WordPress content units into the existing multi-pass translation pipeline.
- [packages/wordpress-plugin/](packages/wordpress-plugin) contains the Polylang-backed WordPress plugin package.
- [docs/reference-material.md](docs/reference-material.md) explains the Swedish source and English draft PDFs in `docs/`.
- [eslint.config.mjs](eslint.config.mjs) defines the enforced code-quality rules.
- [jest.config.ts](jest.config.ts) configures unit tests.
- [playwright.config.ts](playwright.config.ts) configures browser tests.

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
- The current `Röd Tvilling` integration is a style and terminology seed, not yet a full corpus-backed QA system.

## Scripts

- `npm run dev` - start the development server
- `npm run lint` - run ESLint
- `npm run typecheck` - run the TypeScript compiler
- `npm run test:unit` - run Jest unit tests
- `npm run test:wordpress` - run the WordPress plugin PHP tests
- `npm run test:e2e` - run Playwright browser tests
- `npm run build` - build for production
- `npm run verify` - run lint, typecheck, format check, unit tests, and build
