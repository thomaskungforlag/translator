# Thomas Kung Author Translation Studio

Next.js + TypeScript + MUI foundation for a multi-pass literary translation workbench.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `OPENAI_API_KEY` when connecting the translation pipeline.
3. Run `npm run dev`.

## Scripts

- `npm run dev` - start the development server
- `npm run lint` - run ESLint
- `npm run typecheck` - run the TypeScript compiler
- `npm run test:unit` - run Jest unit tests
- `npm run test:e2e` - run Playwright browser tests
- `npm run build` - build for production
- `npm run verify` - run lint, typecheck, format check, unit tests, and build
