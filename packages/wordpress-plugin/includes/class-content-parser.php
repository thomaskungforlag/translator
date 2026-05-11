<?php

declare(strict_types=1);

namespace ThomasKung\TranslatorPlugin;

use DOMDocument;
use DOMXPath;

final class ContentParser
{
    /**
     * @var array<int, string>
     */
    private const SUPPORTED_BLOCKS = [
        'core/paragraph',
        'core/heading',
        'core/list',
        'core/quote',
        'core/button',
        'core/table',
        'core/freeform',
    ];

    /**
     * @param array<int, array<string, mixed>> $blocks
     * @return array{units: array<int, array<string, mixed>>, warnings: array<int, array<string, string>>}
     */
    public function extractUnits(array $blocks, string $parentPath = ''): array
    {
        $units = [];
        $warnings = [];

        foreach ($blocks as $index => $block) {
            $blockPath = $this->buildBlockPath($parentPath, $index);
            $innerBlocks = is_array($block['innerBlocks'] ?? null) ? $block['innerBlocks'] : [];

            if ($innerBlocks !== []) {
                $nested = $this->extractUnits($innerBlocks, $blockPath);
                $units = array_merge($units, $nested['units']);
                $warnings = array_merge($warnings, $nested['warnings']);
            }

            if (! $this->isSupportedLeafBlock($block, $innerBlocks)) {
                if ($this->shouldPreserveBlock($block, $innerBlocks)) {
                    $units[] = $this->buildPreservedUnit($block, $blockPath);
                    $warnings[] = [
                        'code' => 'unsupported_block',
                        'message' => sprintf(
                            'Preserving %s without translation because it is unsupported in v1.',
                            $this->resolveBlockType($block)
                        ),
                        'unitKey' => $blockPath . ':preserve',
                        'blockType' => $this->resolveBlockType($block),
                    ];
                }

                continue;
            }

            $html = (string) ($block['innerHTML'] ?? '');

            foreach ($this->extractHtmlTextUnits($html, $blockPath, $this->resolveBlockType($block)) as $unit) {
                $units[] = $unit;
            }
        }

        return [
            'units' => $units,
            'warnings' => $warnings,
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $blocks
     * @param array<int, array<string, mixed>> $translatedUnits
     * @return array{blocks: array<int, array<string, mixed>>, warnings: array<int, array<string, string>>}
     */
    public function rehydrateBlocks(
        array $blocks,
        array $translatedUnits,
        string $parentPath = ''
    ): array {
        $updatedBlocks = [];
        $warnings = [];
        $translatedByKey = [];

        foreach ($translatedUnits as $unit) {
            $translatedByKey[(string) $unit['key']] = $unit;
        }

        foreach ($blocks as $index => $block) {
            $blockPath = $this->buildBlockPath($parentPath, $index);
            $innerBlocks = is_array($block['innerBlocks'] ?? null) ? $block['innerBlocks'] : [];

            if ($innerBlocks !== []) {
                $nested = $this->rehydrateBlocks($innerBlocks, $translatedUnits, $blockPath);
                $block['innerBlocks'] = $nested['blocks'];
                $warnings = array_merge($warnings, $nested['warnings']);
            }

            if (! $this->isSupportedLeafBlock($block, $innerBlocks)) {
                $updatedBlocks[] = $block;
                continue;
            }

            $hydrated = $this->replaceHtmlTextUnits(
                (string) ($block['innerHTML'] ?? ''),
                $blockPath,
                $translatedByKey
            );

            $block['innerHTML'] = $hydrated['html'];
            $block['innerContent'] = [$hydrated['html']];
            $updatedBlocks[] = $block;
            $warnings = array_merge($warnings, $hydrated['warnings']);
        }

        return [
            'blocks' => $updatedBlocks,
            'warnings' => $warnings,
        ];
    }

    private function buildBlockPath(string $parentPath, int $index): string
    {
        if ($parentPath === '') {
            return sprintf('block:%d', $index);
        }

        return sprintf('%s/block:%d', $parentPath, $index);
    }

    /**
     * @param array<string, mixed> $block
     * @param array<int, array<string, mixed>> $innerBlocks
     */
    private function isSupportedLeafBlock(array $block, array $innerBlocks): bool
    {
        return $innerBlocks === [] && in_array($this->resolveBlockType($block), self::SUPPORTED_BLOCKS, true);
    }

    /**
     * @param array<string, mixed> $block
     * @param array<int, array<string, mixed>> $innerBlocks
     */
    private function shouldPreserveBlock(array $block, array $innerBlocks): bool
    {
        if ($innerBlocks !== []) {
            return false;
        }

        return trim($this->extractVisibleText($block)) !== '';
    }

    /**
     * @param array<string, mixed> $block
     * @return array<string, mixed>
     */
    private function buildPreservedUnit(array $block, string $blockPath): array
    {
        $visibleText = trim($this->extractVisibleText($block));

        return [
            'key' => $blockPath . ':preserve',
            'blockType' => $this->resolveBlockType($block),
            'path' => $blockPath,
            'sourceText' => $visibleText !== '' ? $visibleText : sprintf('[Preserved block: %s]', $this->resolveBlockType($block)),
            'status' => 'preserve',
            'metadata' => [
                'reason' => 'unsupported_block',
            ],
        ];
    }

    /**
     * @param array<string, mixed> $block
     */
    private function resolveBlockType(array $block): string
    {
        $blockName = isset($block['blockName']) ? (string) $block['blockName'] : '';

        return $blockName !== '' ? $blockName : 'unknown';
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function extractHtmlTextUnits(string $html, string $blockPath, string $blockType): array
    {
        $document = $this->loadHtmlDocument($html);
        $xpath = new DOMXPath($document);
        $textNodes = $xpath->query('//div[@data-tkpt-root="1"]//text()[normalize-space(.) != ""]');

        if ($textNodes === false) {
            return [];
        }

        $units = [];
        $position = 0;

        foreach ($textNodes as $textNode) {
            $parentName = strtolower($textNode->parentNode?->nodeName ?? '');

            if ($parentName === 'script' || $parentName === 'style') {
                continue;
            }

            $rawText = $textNode->textContent ?? '';
            $trimmed = trim($rawText);

            if ($trimmed === '') {
                continue;
            }

            $position += 1;
            preg_match('/^\s*/u', $rawText, $leadingMatch);
            preg_match('/\s*$/u', $rawText, $trailingMatch);

            $units[] = [
                'key' => sprintf('%s:text:%d', $blockPath, $position),
                'blockType' => $blockType,
                'path' => sprintf('%s/text:%d', $blockPath, $position),
                'sourceText' => $trimmed,
                'status' => 'translate',
                'metadata' => [
                    'nodePath' => $textNode->getNodePath(),
                    'leadingWhitespace' => $leadingMatch[0] ?? '',
                    'trailingWhitespace' => $trailingMatch[0] ?? '',
                ],
            ];
        }

        return $units;
    }

    /**
     * @param array<string, array<string, mixed>> $translatedByKey
     * @return array{html: string, warnings: array<int, array<string, string>>}
     */
    private function replaceHtmlTextUnits(string $html, string $blockPath, array $translatedByKey): array
    {
        $document = $this->loadHtmlDocument($html);
        $xpath = new DOMXPath($document);
        $textNodes = $xpath->query('//div[@data-tkpt-root="1"]//text()[normalize-space(.) != ""]');

        if ($textNodes === false) {
            return [
                'html' => $html,
                'warnings' => [],
            ];
        }

        $warnings = [];
        $position = 0;

        foreach ($textNodes as $textNode) {
            $parentName = strtolower($textNode->parentNode?->nodeName ?? '');

            if ($parentName === 'script' || $parentName === 'style') {
                continue;
            }

            $rawText = $textNode->textContent ?? '';

            if (trim($rawText) === '') {
                continue;
            }

            $position += 1;
            $key = sprintf('%s:text:%d', $blockPath, $position);

            if (! isset($translatedByKey[$key]['translatedText'])) {
                $warnings[] = [
                    'code' => 'markup_preservation',
                    'message' => sprintf('Missing translated text for %s during rehydration.', $key),
                    'unitKey' => $key,
                    'blockType' => (string) ($translatedByKey[$key]['blockType'] ?? 'unknown'),
                ];
                continue;
            }

            $metadata = is_array($translatedByKey[$key]['metadata'] ?? null)
                ? $translatedByKey[$key]['metadata']
                : [];
            $leadingWhitespace = isset($metadata['leadingWhitespace'])
                ? (string) $metadata['leadingWhitespace']
                : '';
            $trailingWhitespace = isset($metadata['trailingWhitespace'])
                ? (string) $metadata['trailingWhitespace']
                : '';
            $translatedText = trim((string) $translatedByKey[$key]['translatedText']);
            $textNode->textContent = $leadingWhitespace . $translatedText . $trailingWhitespace;
        }

        return [
            'html' => $this->extractRootInnerHtml($document),
            'warnings' => $warnings,
        ];
    }

    /**
     * @param array<string, mixed> $block
     */
    private function extractVisibleText(array $block): string
    {
        $innerHtml = (string) ($block['innerHTML'] ?? '');

        if ($innerHtml !== '') {
            return trim(wp_strip_all_tags($innerHtml));
        }

        $innerContent = is_array($block['innerContent'] ?? null) ? $block['innerContent'] : [];

        return trim(wp_strip_all_tags(implode('', array_map('strval', $innerContent))));
    }

    private function loadHtmlDocument(string $html): DOMDocument
    {
        $document = new DOMDocument('1.0', 'UTF-8');
        $wrappedHtml = sprintf(
            '<!DOCTYPE html><html><body><div data-tkpt-root="1">%s</div></body></html>',
            $html
        );

        $previous = libxml_use_internal_errors(true);
        $document->loadHTML($wrappedHtml, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        return $document;
    }

    private function extractRootInnerHtml(DOMDocument $document): string
    {
        $xpath = new DOMXPath($document);
        $container = $xpath->query('//div[@data-tkpt-root="1"]')->item(0);

        if ($container === null) {
            return '';
        }

        $html = '';

        foreach ($container->childNodes as $childNode) {
            $html .= $document->saveHTML($childNode);
        }

        return $html;
    }
}
