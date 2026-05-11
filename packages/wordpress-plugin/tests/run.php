<?php

declare(strict_types=1);

require_once __DIR__ . '/../includes/interfaces.php';
require_once __DIR__ . '/../includes/class-settings.php';
require_once __DIR__ . '/../includes/class-content-parser.php';
require_once __DIR__ . '/../includes/class-page-translator.php';

if (! function_exists('wp_strip_all_tags')) {
    function wp_strip_all_tags(string $text): string
    {
        return trim(strip_tags($text));
    }
}

use ThomasKung\TranslatorPlugin\ContentParser;
use ThomasKung\TranslatorPlugin\PageRepositoryInterface;
use ThomasKung\TranslatorPlugin\PageTranslator;
use ThomasKung\TranslatorPlugin\Settings;
use ThomasKung\TranslatorPlugin\TranslationServiceClientInterface;

function assertSameValue(mixed $expected, mixed $actual, string $message): void
{
    if ($expected !== $actual) {
        throw new RuntimeException($message . ' Expected: ' . var_export($expected, true) . ' Actual: ' . var_export($actual, true));
    }
}

function assertTrueValue(bool $value, string $message): void
{
    if (! $value) {
        throw new RuntimeException($message);
    }
}

final class FakeServiceClient implements TranslationServiceClientInterface
{
    /**
     * @var array<string, mixed>
     */
    public array $lastPayload = [];

    /**
     * @param array<string, mixed> $response
     */
    public function __construct(private readonly array $response)
    {
    }

    public function translatePage(array $payload): array
    {
        $this->lastPayload = $payload;

        return $this->response;
    }
}

final class FakePageRepository implements PageRepositoryInterface
{
    /**
     * @var array<string, mixed>
     */
    public array $updatedPage = [];

    /**
     * @var array<string, mixed>
     */
    public array $savedReport = [];

    /**
     * @var array<int, array<string, mixed>>
     */
    public array $savedReportsByPostId = [];

    public int $createCalls = 0;

    public bool $linked = false;

    public int $setLanguageCalls = 0;

    public bool $throwMissingSourceLanguage = false;

    /**
     * @param array<string, mixed>|null $existingTarget
     */
    public function __construct(private ?array $existingTarget = null)
    {
    }

    public function getPage(int $postId): array
    {
        if ($this->existingTarget !== null && $postId === (int) $this->existingTarget['ID']) {
            return $this->existingTarget;
        }

        return [
            'ID' => $postId,
            'post_title' => 'Om oss',
            'post_content' => '<!-- wp:paragraph --><p>Hej världen.</p><!-- /wp:paragraph -->',
            'post_name' => 'om-oss',
            'page_template' => '',
            'post_parent' => 0,
            'menu_order' => 0,
        ];
    }

    public function getPostLanguage(int $postId): string
    {
        if ($this->throwMissingSourceLanguage) {
            throw new RuntimeException('Missing source language.');
        }

        return 'sv';
    }

    public function setPostLanguage(int $postId, string $languageCode): void
    {
        $this->setLanguageCalls += 1;
    }

    public function getTargetPost(int $sourcePostId, string $targetLanguageCode): ?array
    {
        return $this->existingTarget;
    }

    public function createTargetDraft(array $sourcePage, string $targetLanguageCode): array
    {
        $this->createCalls += 1;
        $this->existingTarget = [
            'ID' => 501,
            'post_title' => (string) $sourcePage['post_title'],
            'post_content' => '',
            'post_name' => 'about-us',
            'page_template' => '',
            'post_parent' => 0,
            'menu_order' => 0,
        ];

        return $this->existingTarget;
    }

    public function linkTranslations(int $sourcePostId, int $targetPostId, string $targetLanguageCode): void
    {
        $this->linked = true;
    }

    public function updatePage(int $postId, array $data): array
    {
        $this->updatedPage = array_merge(['ID' => $postId], $data);

        return array_merge(
            $this->existingTarget ?? ['ID' => $postId],
            $this->updatedPage
        );
    }

    public function saveTranslationReport(int $postId, array $report): void
    {
        $this->savedReport = $report;
        $this->savedReportsByPostId[$postId] = $report;
    }

    public function getTranslationReport(int $postId): ?array
    {
        return $this->savedReport === [] ? null : $this->savedReport;
    }

    public function getAvailableLanguages(): array
    {
        return [
            ['slug' => 'sv', 'label' => 'Swedish'],
            ['slug' => 'en', 'label' => 'English'],
        ];
    }

    public function parseBlocks(string $content): array
    {
        return [[
            'blockName' => 'core/paragraph',
            'innerHTML' => '<p>Hej världen.</p>',
            'innerContent' => ['<p>Hej världen.</p>'],
            'innerBlocks' => [],
        ]];
    }

    public function serializeBlocks(array $blocks): string
    {
        return implode('', array_map(
            static fn(array $block): string => (string) ($block['innerHTML'] ?? ''),
            $blocks
        ));
    }
}

$sanitized = Settings::sanitize([
    'service_base_url' => 'https://translator.example.com/',
    'service_api_key' => ' secret ',
    'default_source_language' => ' SV ',
]);

assertSameValue('https://translator.example.com', $sanitized['service_base_url'], 'Settings should trim and normalize the service URL.');
assertSameValue('secret', $sanitized['service_api_key'], 'Settings should trim the API key.');
assertSameValue('sv', $sanitized['default_source_language'], 'Settings should normalize the source language.');

$loadedSettings = Settings::get(static fn(string $key, mixed $fallback = null): mixed => [
    'service_base_url' => 'https://translator.example.com',
    'service_api_key' => 'abc123',
]);

assertSameValue('https://translator.example.com', $loadedSettings['service_base_url'], 'Settings::get should merge stored values.');
assertSameValue('sv', $loadedSettings['default_source_language'], 'Settings::get should apply defaults when values are missing.');

$parser = new ContentParser();
$parsed = $parser->extractUnits([
    [
        'blockName' => 'core/paragraph',
        'innerHTML' => '<p>Hej världen.</p>',
        'innerContent' => ['<p>Hej världen.</p>'],
        'innerBlocks' => [],
    ],
    [
        'blockName' => 'acf/custom-hero',
        'innerHTML' => '<div>Behåll detta block.</div>',
        'innerContent' => ['<div>Behåll detta block.</div>'],
        'innerBlocks' => [],
    ],
]);

assertSameValue(2, count($parsed['units']), 'The parser should extract one translatable unit and one preserved unit.');
assertSameValue('translate', $parsed['units'][0]['status'], 'Supported blocks should produce translatable units.');
assertSameValue('preserve', $parsed['units'][1]['status'], 'Unsupported blocks should be preserved.');
assertSameValue(1, count($parsed['warnings']), 'Unsupported blocks should emit a warning.');

$rehydrated = $parser->rehydrateBlocks(
    [[
        'blockName' => 'core/paragraph',
        'innerHTML' => '<p>Hej världen.</p>',
        'innerContent' => ['<p>Hej världen.</p>'],
        'innerBlocks' => [],
    ]],
    [[
        'key' => 'block:0:text:1',
        'blockType' => 'core/paragraph',
        'path' => 'block:0/text:1',
        'sourceText' => 'Hej världen.',
        'translatedText' => 'Hello world.',
        'status' => 'translate',
        'metadata' => [
            'leadingWhitespace' => '',
            'trailingWhitespace' => '',
        ],
    ]]
);

assertTrueValue(
    str_contains((string) $rehydrated['blocks'][0]['innerHTML'], 'Hello world.'),
    'Rehydration should replace the supported block text.'
);

$serviceResponse = [
    'mode' => 'openai',
    'title' => 'About us',
    'translatedContentPayload' => [[
        'key' => 'block:0:text:1',
        'blockType' => 'core/paragraph',
        'path' => 'block:0/text:1',
        'sourceText' => 'Hej världen.',
        'translatedText' => 'Hello world.',
        'status' => 'translate',
        'metadata' => [
            'leadingWhitespace' => '',
            'trailingWhitespace' => '',
        ],
    ]],
    'qaFindings' => [[
        'id' => 'qa-1',
        'severity' => 'warning',
        'category' => 'market_quality',
        'issue' => 'Check CTA tone.',
        'resolved' => false,
    ]],
    'warnings' => [],
    'styleProfileSummary' => [
        'name' => 'Röd Tvilling',
    ],
];

$serviceClientWithNewTarget = new FakeServiceClient($serviceResponse);
$translatorWithNewTarget = new PageTranslator(
    new ContentParser(),
    $serviceClientWithNewTarget,
    new FakePageRepository(),
    'sv'
);
$translatedNewTarget = $translatorWithNewTarget->translatePage(42, 'en');

assertTrueValue($translatedNewTarget['created'], 'A missing target translation should be created.');
assertSameValue(501, $translatedNewTarget['targetPostId'], 'The created target draft should be returned.');
assertSameValue(
    'English',
    $serviceClientWithNewTarget->lastPayload['targetVariantLabel'],
    'The payload should include the target language label.'
);
assertSameValue(
    false,
    array_key_exists('existingTargetPostId', $serviceClientWithNewTarget->lastPayload['pageContext']),
    'The payload should omit the target page id when no target draft exists yet.'
);

$existingTargetRepository = new FakePageRepository([
    'ID' => 777,
    'post_title' => 'Old title',
    'post_content' => '',
    'post_name' => 'about-us',
    'page_template' => '',
    'post_parent' => 0,
    'menu_order' => 0,
]);
$serviceClientWithExistingTarget = new FakeServiceClient(array_merge($serviceResponse, ['mode' => 'fallback']));
$translatorWithExistingTarget = new PageTranslator(
    new ContentParser(),
    $serviceClientWithExistingTarget,
    $existingTargetRepository,
    'sv'
);
$translatedExistingTarget = $translatorWithExistingTarget->translatePage(42, 'en');

assertTrueValue(! $translatedExistingTarget['created'], 'An existing target translation should be updated in place.');
assertSameValue(0, $existingTargetRepository->createCalls, 'Updating an existing translation must not create duplicates.');
assertSameValue('draft', $existingTargetRepository->updatedPage['post_status'], 'Translated targets must remain drafts.');
assertSameValue('fallback', $translatedExistingTarget['mode'], 'Fallback mode should surface in the translation result.');
assertSameValue(1, $existingTargetRepository->savedReport['unresolvedQaCount'], 'The report should count unresolved QA findings.');
assertTrueValue(
    isset($existingTargetRepository->savedReportsByPostId[42], $existingTargetRepository->savedReportsByPostId[777]),
    'The translation report should be saved on both the source and target pages.'
);
assertSameValue(
    777,
    $serviceClientWithExistingTarget->lastPayload['pageContext']['existingTargetPostId'],
    'The payload should include the existing target page id.'
);
assertSameValue(
    'Hello world.',
    wp_strip_all_tags((string) $existingTargetRepository->updatedPage['post_content']),
    'The translated content should be written back into the target draft.'
);

$fallbackLanguageRepository = new FakePageRepository([
    'ID' => 778,
    'post_title' => 'Old title',
    'post_content' => '',
    'post_name' => 'about-us',
    'page_template' => '',
    'post_parent' => 0,
    'menu_order' => 0,
]);
$fallbackLanguageRepository->throwMissingSourceLanguage = true;
$translatorWithFallbackSourceLanguage = new PageTranslator(
    new ContentParser(),
    new FakeServiceClient($serviceResponse),
    $fallbackLanguageRepository,
    'sv'
);
$translatorWithFallbackSourceLanguage->translatePage(42, 'en');
assertSameValue(
    1,
    $fallbackLanguageRepository->setLanguageCalls,
    'The translator should apply the default source language when Polylang has not set one.'
);

echo "WordPress plugin tests passed.\n";
