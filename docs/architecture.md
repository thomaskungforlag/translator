# Architecture

This repo is a Next.js App Router application with a client-side MUI shell and a typed domain layer.

## Layout

- `src/app/` contains the App Router entry points and global layout.
- `src/components/` contains UI components.
- `src/components/studio-shell/` contains the translation studio dashboard panels.
- `src/lib/` contains domain types, schemas, and shared non-UI logic.
- `tests/e2e/` contains browser-level Playwright tests.

## Boundaries

- Keep presentation code in components.
- Keep shared domain types and validation in `src/lib`.
- Keep data access, mutation, and future OpenAI integration out of leaf components.
- Prefer small coordinator components that compose focused children.

## Current Entry Points

- [src/app/layout.tsx](../src/app/layout.tsx) sets up the root layout, metadata, font, and MUI cache provider.
- [src/components/studio-shell.tsx](../src/components/studio-shell.tsx) composes the dashboard layout.
- [src/components/studio-shell/segment-review-panel.tsx](../src/components/studio-shell/segment-review-panel.tsx) shows the segment review workflow.
- [src/lib/domain.ts](../src/lib/domain.ts) defines the project, segment, glossary, and QA types.
