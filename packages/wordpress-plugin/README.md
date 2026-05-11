# WordPress Plugin

This package contains the WordPress + Polylang plugin that calls the Next.js translation service at `/api/wordpress/translate-page`.

<!-- TOC-START -->

<!-- TOC-END -->

## Release Summary

Use these repo scripts:

- `npm run plugin:wordpress:php-lint`
- `npm run test:wordpress`
- `npm run plugin:wordpress:package`
- `npm run plugin:wordpress:release`

The fastest safe path is:

```bash
npm run plugin:wordpress:release
```

That runs repo verification and then creates the distributable ZIP.

## Prerequisites

- WordPress with the Polylang plugin installed and configured.
- This Next.js service running somewhere reachable from WordPress.
- `WORDPRESS_TRANSLATION_API_KEY` configured in this app.
- The same shared API key entered in WordPress plugin settings.

## What It Does

- Adds WordPress admin settings for the translation service base URL, shared service API key, and default source language.
- Adds a manual page translation action for `page` posts.
- Creates a linked Polylang target draft when the target-language page does not exist.
- Updates the target page `post_title` and `post_content` as a draft.
- Preserves unsupported blocks unchanged and surfaces warnings in the translation report.

## WordPress Settings

The plugin adds a settings page in WordPress:

- `Settings -> Thomas Kung Translator`

Available settings:

- `Service Base URL`
  Example: `https://translator.example.com`
- `Service API Key`
  This must match `WORDPRESS_TRANSLATION_API_KEY` in the Next.js app.
- `Default Source Language`
  Defaults to `sv`.

`Default Source Language` is used as a recovery fallback if the source page does not yet have a Polylang language assigned. In that case the plugin assigns the configured default before linking translations.

Important:

- The plugin does not ask for a full endpoint URL.
- The endpoint path is fixed in code as `/api/wordpress/translate-page`.
- The final request URL is:
  `SERVICE_BASE_URL + /api/wordpress/translate-page`

Example:

- Service base URL in WordPress: `https://translator.example.com`
- Effective API endpoint: `https://translator.example.com/api/wordpress/translate-page`

## Service Configuration

In this repo, set the shared API key in:

- [.env.example](/Users/thomashagstrom/Source/translator/.env.example)
- [env.ts](/Users/thomashagstrom/Source/translator/src/lib/env.ts)

Runtime variable:

- `WORDPRESS_TRANSLATION_API_KEY`

The route that validates this key is:

- [route.ts](/Users/thomashagstrom/Source/translator/src/app/api/wordpress/translate-page/route.ts)

## Install and Configure

1. Deploy or run this Next.js app where WordPress can reach it.
2. Set `WORDPRESS_TRANSLATION_API_KEY` in the app environment.
3. Package the plugin ZIP from this repo.
4. Install this plugin in WordPress.
5. In WordPress, open `Settings -> Thomas Kung Translator`.
6. Enter the service base URL.
7. Enter the same shared API key.
8. Save settings.
9. Confirm Polylang languages are configured for the site.

## Package the Plugin

Versioning comes from the plugin header in:

- [thomas-kung-polylang-translator.php](/Users/thomashagstrom/Source/translator/packages/wordpress-plugin/thomas-kung-polylang-translator.php)

Before packaging a release:

1. Update the `Version:` field in the plugin header if you are shipping a new plugin version.
2. Run:

```bash
npm run plugin:wordpress:release
```

Or, if you only want the ZIP without the full release-prep gate:

```bash
npm run plugin:wordpress:package
```

Packaging output:

- ZIP: `dist/wordpress-plugin/thomas-kung-polylang-translator-<version>.zip`
- checksum: `dist/wordpress-plugin/thomas-kung-polylang-translator-<version>.sha256`

The ZIP contains a clean WordPress-installable root folder:

- `thomas-kung-polylang-translator/`

Included files:

- plugin entry file
- `includes/`
- plugin `README.md`

Excluded files:

- `tests/`
- repo-level files not needed for WordPress install

## Release Checklist

1. Update the plugin version header.
2. Run `npm run plugin:wordpress:release`.
3. Confirm the ZIP and checksum were created under `dist/wordpress-plugin/`.
4. In WordPress admin, upload the ZIP via `Plugins -> Add Plugin -> Upload Plugin`.
5. Activate the plugin.
6. Configure `Settings -> Thomas Kung Translator`.
7. Test one source page to one target language before wider rollout.

If you are publishing a GitHub release as well:

1. Attach the generated ZIP.
2. Attach the generated `.sha256` file.
3. Include the plugin version and any migration or configuration notes in the release text.

## How Editors Use It

Two entry points are available:

- Page edit screen meta box
- Page list row action

The editor flow is:

1. Open a Swedish source page.
2. Choose a target language.
3. Click `Translate Draft`.
4. The plugin finds the Polylang target page.
5. If it does not exist, the plugin creates a linked draft page.
6. The translated title and supported content blocks are written to the target page as `draft`.
7. The saved translation report is written to both the source page and the target page.
8. The report shows the provider mode, unresolved QA count, provider message, and warnings.

## Supported Content Handling

V1 translates only supported text-bearing Gutenberg blocks. The parser lives in:

- [class-content-parser.php](/Users/thomashagstrom/Source/translator/packages/wordpress-plugin/includes/class-content-parser.php)

Supported blocks:

- `core/paragraph`
- `core/heading`
- `core/list`
- `core/quote`
- `core/button`
- `core/table`
- `core/freeform`

Behavior for unsupported blocks:

- The block is preserved unchanged.
- A warning is added to the translation report.
- The translation continues unless rehydration fails.

## Translation Contract

The WordPress route uses a dedicated request/response schema rather than the app UI payload.

Key files:

- [wordpress-translation-schemas.ts](/Users/thomashagstrom/Source/translator/src/lib/wordpress-translation-schemas.ts)
- [wordpress-translation.ts](/Users/thomashagstrom/Source/translator/src/lib/wordpress-translation.ts)

The plugin does not own prompt logic.

It relies on the service for:

- model selection
- multi-pass orchestration
- `Röd Tvilling` style seed usage
- glossary and locked-term handling
- QA rules
- degraded fallback semantics

## Limitations

- V1 targets WordPress `page` posts only.
- V1 is manual per-page only.
- Slug translation is not implemented.
- SEO field translation is not implemented.
- Media localization is not implemented.
- Unsupported/custom blocks are preserved, not translated.
- The current `Röd Tvilling` integration is a style seed, not a full corpus-backed website QA engine.

## Package Layout

- `thomas-kung-polylang-translator.php` registers the plugin.
- `includes/class-content-parser.php` extracts and rehydrates supported Gutenberg content units.
- `includes/class-page-translator.php` coordinates Polylang draft creation and service calls.
- `includes/class-wordpress-page-repository.php` bridges WordPress and Polylang APIs.
- `includes/class-wordpress-service-client.php` calls the Next.js translation route.
- `tests/run.php` runs the plugin’s PHP test coverage without a full WordPress install.

## Test

```bash
php packages/wordpress-plugin/tests/run.php
```

PHP syntax checks:

```bash
npm run plugin:wordpress:php-lint
```

Full repo verification still runs through:

```bash
npm run verify
```
