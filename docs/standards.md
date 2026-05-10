# Standards

This project uses strict linting and explicit quality gates so new code stays small, readable, and testable.

## TypeScript

- Use TypeScript for app code.
- Prefer domain types from [src/lib/domain.ts](../src/lib/domain.ts).
- Avoid `any`; narrow `unknown` instead of loosening types.
- Add explicit return types where inference is not obvious.

## ESLint

The enforced rules live in [eslint.config.mjs](../eslint.config.mjs).

Current guardrails:

- `complexity: 8`
- `max-depth: 3`
- `max-len: 100`
- `max-lines: 250`
- `max-lines-per-function: 80`
- `max-params: 4`

These limits are intentional. They push large components and functions into smaller units.

## Prettier

- Prettier is the formatting source of truth.
- Do not hand-format code to bypass the formatter.
- Use `npm run format` when files drift.

## Component Design

- Prefer a coordinator component that composes focused leaf components.
- Keep UI logic close to the UI, but move repeated behavior into small helpers or child components.
- Avoid deep prop drilling unless the data is genuinely local.

## Testing

- Follow TDD for feature work when practical.
- Add or update tests with the change.
- Keep unit tests close to the component or module they cover.
- Use Playwright for end-to-end flows that need a browser.

## Enforcement

The main quality gate is `npm run verify`.
It runs lint, type checking, formatting checks, unit tests, and the production build.
