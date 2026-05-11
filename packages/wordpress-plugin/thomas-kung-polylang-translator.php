<?php
/**
 * Plugin Name: Thomas Kung Polylang Translator
 * Description: Translate WordPress pages into Polylang-linked drafts using the Thomas Kung translation service.
 * Version: 0.1.0
 * Author: Thomas Kung Förlag
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/includes/interfaces.php';
require_once __DIR__ . '/includes/class-settings.php';
require_once __DIR__ . '/includes/class-content-parser.php';
require_once __DIR__ . '/includes/class-wordpress-service-client.php';
require_once __DIR__ . '/includes/class-wordpress-page-repository.php';
require_once __DIR__ . '/includes/class-page-translator.php';
require_once __DIR__ . '/includes/class-admin.php';

add_action('plugins_loaded', static function (): void {
    if (! is_admin()) {
        return;
    }

    $admin = new \ThomasKung\TranslatorPlugin\Admin(
        new \ThomasKung\TranslatorPlugin\ContentParser(),
        new \ThomasKung\TranslatorPlugin\WordPressPageRepository()
    );

    $admin->register();
});
