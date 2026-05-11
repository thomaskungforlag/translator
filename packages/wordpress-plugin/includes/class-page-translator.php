<?php

declare(strict_types=1);

namespace ThomasKung\TranslatorPlugin;

final class PageTranslator
{
    public function __construct(
        private readonly ContentParser $contentParser,
        private readonly TranslationServiceClientInterface $serviceClient,
        private readonly PageRepositoryInterface $pageRepository
    ) {
    }

    /**
     * @return array{created: bool, mode: string, report: array<string, mixed>, targetPostId: int}
     */
    public function translatePage(int $sourcePostId, string $targetLanguageCode): array
    {
        $sourcePage = $this->pageRepository->getPage($sourcePostId);
        $sourceLanguageCode = $this->pageRepository->getPostLanguage($sourcePostId);
        $sourceBlocks = $this->pageRepository->parseBlocks((string) $sourcePage['post_content']);
        $extracted = $this->contentParser->extractUnits($sourceBlocks);
        $payload = $this->buildPayload(
            $sourcePage,
            $sourceLanguageCode,
            $targetLanguageCode,
            $extracted['units']
        );
        $response = $this->serviceClient->translatePage($payload);
        $rehydrated = $this->contentParser->rehydrateBlocks(
            $sourceBlocks,
            is_array($response['translatedContentPayload'] ?? null)
                ? $response['translatedContentPayload']
                : []
        );
        $targetPage = $this->pageRepository->getTargetPost($sourcePostId, $targetLanguageCode);
        $created = false;

        if ($targetPage === null) {
            $targetPage = $this->pageRepository->createTargetDraft($sourcePage, $targetLanguageCode);
            $this->pageRepository->linkTranslations(
                $sourcePostId,
                (int) $targetPage['ID'],
                $targetLanguageCode
            );
            $created = true;
        }

        $updatedTargetPage = $this->pageRepository->updatePage(
            (int) $targetPage['ID'],
            [
                'post_title' => (string) ($response['title'] ?? $sourcePage['post_title']),
                'post_content' => $this->pageRepository->serializeBlocks($rehydrated['blocks']),
                'post_status' => 'draft',
            ]
        );
        $report = $this->buildReport(
            $sourcePostId,
            $targetLanguageCode,
            $response,
            $extracted['warnings'],
            $rehydrated['warnings']
        );

        $this->pageRepository->saveTranslationReport((int) $updatedTargetPage['ID'], $report);

        return [
            'created' => $created,
            'mode' => (string) ($response['mode'] ?? 'fallback'),
            'report' => $report,
            'targetPostId' => (int) $updatedTargetPage['ID'],
        ];
    }

    /**
     * @param array<string, mixed> $sourcePage
     * @param array<int, array<string, mixed>> $contentUnits
     * @return array<string, mixed>
     */
    private function buildPayload(
        array $sourcePage,
        string $sourceLanguageCode,
        string $targetLanguageCode,
        array $contentUnits
    ): array {
        return [
            'sourcePostId' => (int) $sourcePage['ID'],
            'sourceLanguageCode' => $sourceLanguageCode,
            'targetLanguageCode' => $targetLanguageCode,
            'title' => (string) $sourcePage['post_title'],
            'contentType' => 'website_copy',
            'contentPayload' => $contentUnits,
            'pageContext' => [
                'slug' => (string) ($sourcePage['post_name'] ?? ''),
                'templateName' => (string) ($sourcePage['page_template'] ?? ''),
                'path' => (string) ($sourcePage['post_name'] ?? ''),
            ],
        ];
    }

    /**
     * @param array<string, mixed> $response
     * @param array<int, array<string, string>> $extractionWarnings
     * @param array<int, array<string, string>> $rehydrationWarnings
     * @return array<string, mixed>
     */
    private function buildReport(
        int $sourcePostId,
        string $targetLanguageCode,
        array $response,
        array $extractionWarnings,
        array $rehydrationWarnings
    ): array {
        $qaFindings = is_array($response['qaFindings'] ?? null) ? $response['qaFindings'] : [];
        $responseWarnings = is_array($response['warnings'] ?? null) ? $response['warnings'] : [];

        return [
            'sourcePostId' => $sourcePostId,
            'targetLanguageCode' => $targetLanguageCode,
            'mode' => (string) ($response['mode'] ?? 'fallback'),
            'message' => isset($response['message']) ? (string) $response['message'] : '',
            'lastRunAt' => gmdate('c'),
            'unresolvedQaCount' => count(array_filter(
                $qaFindings,
                static fn(array $finding): bool => isset($finding['resolved']) && $finding['resolved'] === false
            )),
            'warnings' => array_values(array_merge($responseWarnings, $extractionWarnings, $rehydrationWarnings)),
            'qaFindings' => $qaFindings,
            'styleProfileSummary' => is_array($response['styleProfileSummary'] ?? null)
                ? $response['styleProfileSummary']
                : [],
        ];
    }
}
