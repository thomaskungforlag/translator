# Thomas Kung Author Translation Studio

Next.js + TypeScript + MUI foundation for a multi-pass literary translation workbench.

## Start Here

If you are new to the repo, read these in order:

1. [docs/architecture.md](docs/architecture.md) for the codebase shape and boundaries.
2. [docs/standards.md](docs/standards.md) for the TypeScript, ESLint, Prettier, and SOC rules.
3. [docs/testing.md](docs/testing.md) for the TDD and browser-testing workflow.
4. [docs/reference-material.md](docs/reference-material.md) for how the Röd Tvilling PDFs should be used.
5. [thomas_kung_translation_app_plan.md](thomas_kung_translation_app_plan.md) for the product plan.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `OPENAI_API_KEY` to enable the OpenAI-backed pipeline.
3. Optionally set `OPENAI_MODEL` if you want to override the default model.
4. Run `npm run dev`.

## Code Map

- [src/app/layout.tsx](src/app/layout.tsx) sets up the App Router shell, fonts, metadata, and MUI cache.
- [src/components/studio-shell.tsx](src/components/studio-shell.tsx) is the top-level UI coordinator.
- [src/components/studio-shell/](src/components/studio-shell) holds the small dashboard panels and review widgets.
- [src/lib/domain.ts](src/lib/domain.ts) defines the domain types and Zod schemas.
- [src/lib/translation.ts](src/lib/translation.ts) adapts the OpenAI response into the app's project shape.
- [src/app/api/translate/route.ts](src/app/api/translate/route.ts) exposes the translation pipeline endpoint.
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
- Playwright covers browser flows and smoke tests.
- The translation endpoint falls back to the local demo pipeline if OpenAI is unavailable.

## Scripts

- `npm run dev` - start the development server
- `npm run lint` - run ESLint
- `npm run typecheck` - run the TypeScript compiler
- `npm run test:unit` - run Jest unit tests
- `npm run test:e2e` - run Playwright browser tests
- `npm run build` - build for production
- `npm run verify` - run lint, typecheck, format check, unit tests, and build
