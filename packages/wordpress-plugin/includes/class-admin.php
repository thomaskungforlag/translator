<?php

declare(strict_types=1);

namespace ThomasKung\TranslatorPlugin;

use RuntimeException;
use WP_Post;

final class Admin
{
    public function __construct(
        private readonly ContentParser $contentParser,
        private readonly PageRepositoryInterface $pageRepository
    ) {
    }

    public function register(): void
    {
        add_action('admin_init', [$this, 'registerSettings']);
        add_action('admin_menu', [$this, 'registerMenus']);
        add_action('add_meta_boxes_page', [$this, 'registerMetaBoxes']);
        add_filter('page_row_actions', [$this, 'addPageRowAction'], 10, 2);
        add_action('admin_post_tkpt_translate_page', [$this, 'handleTranslatePage']);
        add_action('admin_notices', [$this, 'renderAdminNotices']);
    }

    public function registerSettings(): void
    {
        register_setting(
            'tkpt_settings',
            Settings::OPTION_KEY,
            [
                'type' => 'array',
                'sanitize_callback' => [Settings::class, 'sanitize'],
                'default' => Settings::defaults(),
            ]
        );
    }

    public function registerMenus(): void
    {
        add_options_page(
            'Thomas Kung Translator',
            'Thomas Kung Translator',
            'manage_options',
            'tkpt-settings',
            [$this, 'renderSettingsPage']
        );

        add_submenu_page(
            null,
            'Translate Page',
            'Translate Page',
            'edit_pages',
            'tkpt-translate-page',
            [$this, 'renderTranslatePage']
        );
    }

    public function registerMetaBoxes(): void
    {
        add_meta_box(
            'tkpt-translate-page',
            'Translate with Thomas Kung',
            [$this, 'renderTranslateMetaBox'],
            'page',
            'side',
            'high'
        );
        add_meta_box(
            'tkpt-translation-report',
            'Translation Report',
            [$this, 'renderReportMetaBox'],
            'page',
            'side',
            'default'
        );
    }

    /**
     * @param array<string, string> $actions
     * @return array<string, string>
     */
    public function addPageRowAction(array $actions, WP_Post $post): array
    {
        if (! current_user_can('edit_page', $post->ID)) {
            return $actions;
        }

        $actions['tkpt_translate'] = sprintf(
            '<a href="%s">Translate</a>',
            esc_url(
                admin_url(
                    sprintf('admin.php?page=tkpt-translate-page&post=%d', (int) $post->ID)
                )
            )
        );

        return $actions;
    }

    public function renderSettingsPage(): void
    {
        if (! current_user_can('manage_options')) {
            return;
        }

        $settings = Settings::get();
        ?>
        <div class="wrap">
            <h1>Thomas Kung Translator</h1>
            <form action="options.php" method="post">
                <?php settings_fields('tkpt_settings'); ?>
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><label for="tkpt-service-base-url">Service Base URL</label></th>
                        <td>
                            <input id="tkpt-service-base-url" name="<?php echo esc_attr(Settings::OPTION_KEY); ?>[service_base_url]" type="url" class="regular-text" value="<?php echo esc_attr($settings['service_base_url']); ?>" />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="tkpt-service-api-key">Service API Key</label></th>
                        <td>
                            <input id="tkpt-service-api-key" name="<?php echo esc_attr(Settings::OPTION_KEY); ?>[service_api_key]" type="password" class="regular-text" value="<?php echo esc_attr($settings['service_api_key']); ?>" />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="tkpt-default-source-language">Default Source Language</label></th>
                        <td>
                            <input id="tkpt-default-source-language" name="<?php echo esc_attr(Settings::OPTION_KEY); ?>[default_source_language]" type="text" class="regular-text" value="<?php echo esc_attr($settings['default_source_language']); ?>" />
                        </td>
                    </tr>
                </table>
                <?php submit_button('Save Settings'); ?>
            </form>
        </div>
        <?php
    }

    public function renderTranslatePage(): void
    {
        $postId = isset($_GET['post']) ? absint((string) $_GET['post']) : 0;

        if ($postId <= 0 || ! current_user_can('edit_page', $postId)) {
            wp_die('You are not allowed to translate this page.');
        }

        $post = get_post($postId);

        if (! $post instanceof WP_Post) {
            wp_die('The source page could not be found.');
        }

        echo '<div class="wrap"><h1>Translate Page</h1>';
        $this->renderTranslationForm($post);
        echo '</div>';
    }

    public function renderTranslateMetaBox(WP_Post $post): void
    {
        $this->renderTranslationForm($post);
    }

    public function renderReportMetaBox(WP_Post $post): void
    {
        $report = $this->pageRepository->getTranslationReport((int) $post->ID);

        if ($report === null) {
            echo '<p>No translation report saved for this page yet.</p>';
            return;
        }

        $warnings = is_array($report['warnings'] ?? null) ? $report['warnings'] : [];
        $sourcePostId = isset($report['sourcePostId']) ? (int) $report['sourcePostId'] : 0;
        $targetPostId = isset($report['targetPostId']) ? (int) $report['targetPostId'] : 0;
        $message = isset($report['message']) ? trim((string) $report['message']) : '';
        ?>
        <p><strong>Last run:</strong> <?php echo esc_html((string) ($report['lastRunAt'] ?? '')); ?></p>
        <p><strong>Mode:</strong> <?php echo esc_html((string) ($report['mode'] ?? '')); ?></p>
        <p><strong>Target language:</strong> <?php echo esc_html((string) ($report['targetLanguageCode'] ?? '')); ?></p>
        <p><strong>Unresolved QA:</strong> <?php echo esc_html((string) ($report['unresolvedQaCount'] ?? '0')); ?></p>
        <?php if ($sourcePostId > 0 && $sourcePostId !== (int) $post->ID) : ?>
            <p>
                <strong>Source page:</strong>
                <a href="<?php echo esc_url(get_edit_post_link($sourcePostId)); ?>">Open source page</a>
            </p>
        <?php endif; ?>
        <?php if ($targetPostId > 0 && $targetPostId !== (int) $post->ID) : ?>
            <p>
                <strong>Target page:</strong>
                <a href="<?php echo esc_url(get_edit_post_link($targetPostId)); ?>">Open target draft</a>
            </p>
        <?php endif; ?>
        <?php if ($message !== '') : ?>
            <p><strong>Provider message:</strong> <?php echo esc_html($message); ?></p>
        <?php endif; ?>
        <?php if ($warnings !== []) : ?>
            <p><strong>Warnings:</strong></p>
            <ul>
                <?php foreach ($warnings as $warning) : ?>
                    <li><?php echo esc_html((string) ($warning['message'] ?? 'Warning')); ?></li>
                <?php endforeach; ?>
            </ul>
        <?php else : ?>
            <p>No warnings were reported.</p>
        <?php endif; ?>
        <?php
    }

    public function handleTranslatePage(): void
    {
        $postId = isset($_POST['post_id']) ? absint((string) $_POST['post_id']) : 0;
        $targetLanguageCode = isset($_POST['target_language_code'])
            ? sanitize_text_field((string) $_POST['target_language_code'])
            : '';
        $redirectTarget = isset($_POST['redirect_target'])
            ? sanitize_text_field((string) $_POST['redirect_target'])
            : '';

        if ($postId <= 0 || $targetLanguageCode === '') {
            $this->redirectWithNotice($postId, 'error', 'Missing translation target.');
        }

        if (! current_user_can('edit_page', $postId)) {
            wp_die('You are not allowed to translate this page.');
        }

        check_admin_referer('tkpt_translate_page_' . $postId);

        try {
            $translator = $this->createTranslator();
            $result = $translator->translatePage($postId, $targetLanguageCode);
            $redirectUrl = $redirectTarget === 'page_list'
                ? admin_url(sprintf('post.php?post=%d&action=edit', (int) $result['targetPostId']))
                : admin_url(sprintf('post.php?post=%d&action=edit', (int) $result['targetPostId']));

            wp_safe_redirect(add_query_arg([
                'tkpt_notice' => 'translated',
                'tkpt_mode' => (string) $result['mode'],
                'tkpt_created' => $result['created'] ? '1' : '0',
            ], $redirectUrl));
            exit;
        } catch (RuntimeException $exception) {
            $this->redirectWithNotice($postId, 'error', $exception->getMessage());
        }
    }

    public function renderAdminNotices(): void
    {
        $notice = isset($_GET['tkpt_notice']) ? sanitize_text_field((string) $_GET['tkpt_notice']) : '';

        if ($notice === 'translated') {
            $mode = isset($_GET['tkpt_mode']) ? sanitize_text_field((string) $_GET['tkpt_mode']) : '';
            $created = isset($_GET['tkpt_created']) && (string) $_GET['tkpt_created'] === '1';
            $message = $created
                ? 'Created a linked Polylang draft translation.'
                : 'Updated the existing Polylang draft translation.';

            if ($mode === 'fallback') {
                $message .= ' Degraded fallback output was used; review before publishing.';
            }

            printf('<div class="notice notice-success"><p>%s</p></div>', esc_html($message));
        }

        if ($notice === 'error') {
            $message = isset($_GET['tkpt_message'])
                ? sanitize_text_field((string) $_GET['tkpt_message'])
                : 'Translation failed.';

            printf('<div class="notice notice-error"><p>%s</p></div>', esc_html($message));
        }
    }

    private function renderTranslationForm(WP_Post $post): void
    {
        $settings = Settings::get();

        try {
            $sourceLanguage = $this->pageRepository->getPostLanguage((int) $post->ID);
            $targetLanguages = array_values(array_filter(
                $this->pageRepository->getAvailableLanguages(),
                static fn(array $language): bool => $language['slug'] !== $sourceLanguage
            ));
        } catch (RuntimeException $exception) {
            printf('<p>%s</p>', esc_html($exception->getMessage()));
            return;
        }

        if ($settings['service_base_url'] === '' || $settings['service_api_key'] === '') {
            printf(
                '<p>%s</p>',
                esc_html(
                    'Configure the service base URL and shared API key in Settings -> Thomas Kung Translator before translating.'
                )
            );

            return;
        }

        if ($targetLanguages === []) {
            echo '<p>No target languages are available in Polylang.</p>';
            return;
        }

        ?>
        <form action="<?php echo esc_url(admin_url('admin-post.php')); ?>" method="post">
            <?php wp_nonce_field('tkpt_translate_page_' . $post->ID); ?>
            <input type="hidden" name="action" value="tkpt_translate_page" />
            <input type="hidden" name="post_id" value="<?php echo esc_attr((string) $post->ID); ?>" />
            <input type="hidden" name="redirect_target" value="page_list" />
            <p>
                <label for="tkpt-target-language-<?php echo esc_attr((string) $post->ID); ?>">Target language</label>
                <select
                    id="tkpt-target-language-<?php echo esc_attr((string) $post->ID); ?>"
                    name="target_language_code"
                >
                    <?php foreach ($targetLanguages as $language) : ?>
                        <?php $existingTarget = $this->pageRepository->getTargetPost((int) $post->ID, $language['slug']); ?>
                        <option value="<?php echo esc_attr($language['slug']); ?>">
                            <?php
                            echo esc_html(
                                $existingTarget === null
                                    ? $language['label'] . ' - create draft'
                                    : $language['label'] . ' - update draft'
                            );
                            ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </p>
            <p>
                <button type="submit" class="button button-primary">
                    Translate Draft
                </button>
            </p>
        </form>
        <?php
    }

    private function createTranslator(): PageTranslator
    {
        $settings = Settings::get();

        return new PageTranslator(
            $this->contentParser,
            new WordPressServiceClient(
                $settings['service_base_url'],
                $settings['service_api_key']
            ),
            $this->pageRepository,
            $settings['default_source_language']
        );
    }

    private function redirectWithNotice(int $postId, string $notice, string $message): never
    {
        $redirectUrl = $postId > 0
            ? admin_url(sprintf('post.php?post=%d&action=edit', $postId))
            : admin_url('edit.php?post_type=page');

        wp_safe_redirect(add_query_arg([
            'tkpt_notice' => $notice,
            'tkpt_message' => $message,
        ], $redirectUrl));
        exit;
    }
}
