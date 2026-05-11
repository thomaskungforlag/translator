<?php

declare(strict_types=1);

namespace ThomasKung\TranslatorPlugin;

use RuntimeException;

final class WordPressServiceClient implements TranslationServiceClientInterface
{
    public function __construct(
        private readonly string $serviceBaseUrl,
        private readonly string $serviceApiKey
    ) {
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function translatePage(array $payload): array
    {
        if ($this->serviceBaseUrl === '' || $this->serviceApiKey === '') {
            throw new RuntimeException('Translation service URL and API key are required.');
        }

        if (! function_exists('wp_remote_post')) {
            throw new RuntimeException('WordPress HTTP functions are unavailable.');
        }

        $response = wp_remote_post(
            rtrim($this->serviceBaseUrl, '/') . '/api/wordpress/translate-page',
            [
                'headers' => [
                    'Content-Type' => 'application/json',
                    'X-Translation-Service-Key' => $this->serviceApiKey,
                ],
                'timeout' => 120,
                'body' => wp_json_encode($payload),
            ]
        );

        if (is_wp_error($response)) {
            throw new RuntimeException($response->get_error_message());
        }

        $statusCode = (int) wp_remote_retrieve_response_code($response);
        $body = (string) wp_remote_retrieve_body($response);
        $decoded = json_decode($body, true);

        if ($statusCode < 200 || $statusCode >= 300) {
            $error = is_array($decoded) && isset($decoded['error']) ? (string) $decoded['error'] : 'Unexpected translation service error.';
            throw new RuntimeException($error);
        }

        if (! is_array($decoded)) {
            throw new RuntimeException('Translation service returned invalid JSON.');
        }

        return $decoded;
    }
}
