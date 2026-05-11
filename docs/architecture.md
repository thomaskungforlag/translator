# Architecture

## Table of Contents

- [Layout](#layout)
- [Boundaries](#boundaries)
- [Current Entry Points](#current-entry-points)

## Layout

- `src/app/` contains the App Router entry points and global layout.
- `src/components/` contains UI components.
- `src/components/studio-shell/` contains the translation studio dashboard panels.
- `src/lib/` contains domain types, schemas, and shared non-UI logic.
- `packages/wordpress-plugin/` contains the WordPress + Polylang plugin package that consumes the service API.
- `tests/e2e/` contains browser-level Playwright tests.

## Boundaries

- Keep presentation code in components.
- Keep shared domain types and validation in `src/lib`.
- Keep data access, mutation, and future OpenAI integration out of leaf components.
- Keep WordPress admin and Polylang glue in `packages/wordpress-plugin/`; do not duplicate prompt or QA logic there.
- Keep the WordPress plugin configured against a service base URL; the route path stays fixed in the service layer.
- Prefer small coordinator components that compose focused children.

## Current Entry Points

- [src/app/layout.tsx](../src/app/layout.tsx) sets up the root layout, metadata, font, and MUI cache provider.
- [src/components/studio-shell.tsx](../src/components/studio-shell.tsx) composes the dashboard layout.
- [src/components/studio-shell/segment-review-panel.tsx](../src/components/studio-shell/segment-review-panel.tsx) shows the segment review workflow.
- [src/lib/domain.ts](../src/lib/domain.ts) defines the project, segment, glossary, and QA types.
- [src/app/api/wordpress/translate-page/route.ts](../src/app/api/wordpress/translate-page/route.ts) is the authenticated WordPress-facing translation route.
- [packages/wordpress-plugin/thomas-kung-polylang-translator.php](../packages/wordpress-plugin/thomas-kung-polylang-translator.php) registers the WordPress plugin entry point.
- [packages/wordpress-plugin/README.md](../packages/wordpress-plugin/README.md) documents WordPress settings, the fixed route path, and the editor workflow.
