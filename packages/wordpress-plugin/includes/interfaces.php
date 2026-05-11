<?php

declare(strict_types=1);

namespace ThomasKung\TranslatorPlugin;

interface TranslationServiceClientInterface
{
    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function translatePage(array $payload): array;
}

interface PageRepositoryInterface
{
    /**
     * @return array<string, mixed>
     */
    public function getPage(int $postId): array;

    public function getPostLanguage(int $postId): string;

    /**
     * @return array<string, mixed>|null
     */
    public function getTargetPost(int $sourcePostId, string $targetLanguageCode): ?array;

    /**
     * @param array<string, mixed> $sourcePage
     * @return array<string, mixed>
     */
    public function createTargetDraft(array $sourcePage, string $targetLanguageCode): array;

    public function linkTranslations(int $sourcePostId, int $targetPostId, string $targetLanguageCode): void;

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public function updatePage(int $postId, array $data): array;

    /**
     * @param array<string, mixed> $report
     */
    public function saveTranslationReport(int $postId, array $report): void;

    /**
     * @return array<string, mixed>|null
     */
    public function getTranslationReport(int $postId): ?array;

    /**
     * @return array<int, array{slug: string, label: string}>
     */
    public function getAvailableLanguages(): array;

    /**
     * @return array<int, array<string, mixed>>
     */
    public function parseBlocks(string $content): array;

    /**
     * @param array<int, array<string, mixed>> $blocks
     */
    public function serializeBlocks(array $blocks): string;
}
