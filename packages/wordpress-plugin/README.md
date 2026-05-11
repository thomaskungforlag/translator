# WordPress Plugin

This package contains the WordPress + Polylang plugin that calls the Next.js translation service at `/api/wordpress/translate-page`.

## What It Does

- Adds WordPress admin settings for the translation service base URL and shared service API key.
- Adds a manual page translation action for `page` posts.
- Creates a linked Polylang target draft when the target-language page does not exist.
- Updates the target page `post_title` and `post_content` as a draft.
- Preserves unsupported blocks unchanged and surfaces warnings in the translation report.

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
