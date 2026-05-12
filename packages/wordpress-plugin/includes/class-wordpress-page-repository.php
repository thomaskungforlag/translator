<?php

declare(strict_types=1);

namespace ThomasKung\TranslatorPlugin;

use RuntimeException;

final class WordPressPageRepository implements PageRepositoryInterface
{
    public const REPORT_META_KEY = '_tkpt_translation_report';

    /**
     * @return array<string, mixed>
     */
    public function getPage(int $postId): array
    {
        $post = get_post($postId);

        if ($post === null || (string) $post->post_type !== 'page') {
            throw new RuntimeException('The source page could not be found.');
        }

        return [
            'ID' => (int) $post->ID,
            'post_title' => (string) $post->post_title,
            'post_content' => (string) $post->post_content,
            'post_name' => (string) $post->post_name,
            'page_template' => (string) get_page_template_slug($post->ID),
            'post_parent' => (int) $post->post_parent,
            'menu_order' => (int) $post->menu_order,
        ];
    }

    public function getPostLanguage(int $postId): string
    {
        $this->assertPolylangAvailable();
        $language = pll_get_post_language($postId, 'slug');

        if (! is_string($language) || $language === '') {
            throw new RuntimeException('Polylang source language could not be resolved.');
        }

        return $language;
    }

    public function setPostLanguage(int $postId, string $languageCode): void
    {
        $this->assertPolylangAvailable();
        pll_set_post_language($postId, $languageCode);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getTargetPost(int $sourcePostId, string $targetLanguageCode): ?array
    {
        $this->assertPolylangAvailable();
        $targetPostId = pll_get_post($sourcePostId, $targetLanguageCode);

        if (! is_int($targetPostId) || $targetPostId <= 0) {
            return null;
        }

        return $this->getPage($targetPostId);
    }

    /**
     * @param array<string, mixed> $sourcePage
     * @return array<string, mixed>
     */
    public function createTargetDraft(array $sourcePage, string $targetLanguageCode): array
    {
        $this->assertPolylangAvailable();

        $targetPostId = wp_insert_post(
            [
                'post_type' => 'page',
                'post_status' => 'draft',
                'post_title' => (string) $sourcePage['post_title'],
                'post_parent' => (int) ($sourcePage['post_parent'] ?? 0),
                'menu_order' => (int) ($sourcePage['menu_order'] ?? 0),
                'page_template' => (string) ($sourcePage['page_template'] ?? ''),
            ],
            true
        );

        if (is_wp_error($targetPostId) || ! is_int($targetPostId)) {
            throw new RuntimeException('Failed to create the target-language draft page.');
        }

        pll_set_post_language($targetPostId, $targetLanguageCode);

        return $this->getPage($targetPostId);
    }

    public function linkTranslations(int $sourcePostId, int $targetPostId, string $targetLanguageCode): void
    {
        $this->assertPolylangAvailable();
        $sourceLanguage = $this->getPostLanguage($sourcePostId);
        $translations = pll_get_post_translations($sourcePostId);

        if (! is_array($translations)) {
            $translations = [];
        }

        $translations[$sourceLanguage] = $sourcePostId;
        $translations[$targetLanguageCode] = $targetPostId;
        pll_save_post_translations($translations);
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public function updatePage(int $postId, array $data): array
    {
        $updatedId = wp_update_post(
            array_merge(
                [
                    'ID' => $postId,
                ],
                $data
            ),
            true
        );

        if (is_wp_error($updatedId) || ! is_int($updatedId)) {
            throw new RuntimeException('Failed to update the target-language draft page.');
        }

        return $this->getPage($updatedId);
    }

    /**
     * @param array<string, mixed> $report
     */
    public function saveTranslationReport(int $postId, array $report): void
    {
        update_post_meta($postId, self::REPORT_META_KEY, $report);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getTranslationReport(int $postId): ?array
    {
        $report = get_post_meta($postId, self::REPORT_META_KEY, true);

        return is_array($report) ? $report : null;
    }

    /**
     * @return array<int, array{slug: string, label: string}>
     */
    public function getAvailableLanguages(): array
    {
        $this->assertPolylangAvailable();
        $slugs = pll_languages_list(['fields' => 'slug']);

        if (! is_array($slugs)) {
            return [];
        }

        return array_values(
            array_map(
                static fn(string $slug): array => [
                    'slug' => $slug,
                    'label' => self::labelForLanguage($slug),
                ],
                array_map('strval', $slugs)
            )
        );
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function parseBlocks(string $content): array
    {
        if (function_exists('parse_blocks')) {
            return parse_blocks($content);
        }

        return [[
            'blockName' => 'core/freeform',
            'innerHTML' => $content,
            'innerContent' => [$content],
            'innerBlocks' => [],
        ]];
    }

    /**
     * @param array<int, array<string, mixed>> $blocks
     */
    public function serializeBlocks(array $blocks): string
    {
        if (function_exists('serialize_blocks')) {
            return serialize_blocks($blocks);
        }

        if (function_exists('serialize_block')) {
            return implode('', array_map('serialize_block', $blocks));
        }

        return implode('', array_map(
            static fn(array $block): string => (string) ($block['innerHTML'] ?? ''),
            $blocks
        ));
    }

    private function assertPolylangAvailable(): void
    {
        if (! function_exists('pll_get_post_language')) {
            throw new RuntimeException('Polylang must be installed and configured.');
        }
    }

    private static function labelForLanguage(string $slug): string
    {
        return match ($slug) {
            'sv' => 'Swedish',
            'en' => 'English',
            'en-GB' => 'English (UK)',
            'en-US' => 'English (US)',
            'de' => 'German',
            'fr' => 'French',
            'es' => 'Spanish',
            default => strtoupper($slug),
        };
    }
}
