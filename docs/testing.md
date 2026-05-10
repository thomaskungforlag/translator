# Testing

## Table of Contents

- [Unit Tests](#unit-tests)
- [Browser Tests](#browser-tests)
- [Recommended Flow](#recommended-flow)
- [What To Test](#what-to-test)

## Unit Tests

- Jest runs unit and component tests.
- The current config is in [jest.config.ts](../jest.config.ts).
- Put tests next to the code they cover when that is the clearest option.

## Browser Tests

- Playwright covers browser-level flows and smoke tests.
- The current config is in [playwright.config.ts](../playwright.config.ts).
- Use browser tests for interactions that matter end to end, not for every tiny branch.

## Recommended Flow

1. Write or adjust the failing test.
2. Implement the smallest change that passes.
3. Run `npm run test:unit` for focused feedback.
4. Run `npm run test:e2e` when the change affects browser behavior.
5. Run `npm run verify` before handing work back.

## What To Test

- Rendering of key screens.
- User interactions that change state.
- Edge cases around empty data and missing drafts.
- Business rules that should not regress.
