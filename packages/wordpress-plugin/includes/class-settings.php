<?php

declare(strict_types=1);

namespace ThomasKung\TranslatorPlugin;

final class Settings
{
    public const OPTION_KEY = 'tkpt_settings';

    /**
     * @return array{service_base_url: string, service_api_key: string, default_source_language: string}
     */
    public static function defaults(): array
    {
        return [
            'service_base_url' => '',
            'service_api_key' => '',
            'default_source_language' => 'sv',
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array{service_base_url: string, service_api_key: string, default_source_language: string}
     */
    public static function sanitize(array $input): array
    {
        $serviceBaseUrl = isset($input['service_base_url']) ? trim((string) $input['service_base_url']) : '';
        $serviceApiKey = isset($input['service_api_key']) ? trim((string) $input['service_api_key']) : '';
        $defaultSourceLanguage = isset($input['default_source_language'])
            ? strtolower(trim((string) $input['default_source_language']))
            : 'sv';

        if ($defaultSourceLanguage === '') {
            $defaultSourceLanguage = 'sv';
        }

        return [
            'service_base_url' => rtrim($serviceBaseUrl, '/'),
            'service_api_key' => $serviceApiKey,
            'default_source_language' => $defaultSourceLanguage,
        ];
    }

    /**
     * @param callable(string, mixed=): mixed|null $loader
     * @return array{service_base_url: string, service_api_key: string, default_source_language: string}
     */
    public static function get(?callable $loader = null): array
    {
        $defaults = self::defaults();

        if ($loader === null) {
            if (! function_exists('get_option')) {
                return $defaults;
            }

            $loader = static fn(string $key, mixed $fallback = null): mixed => get_option($key, $fallback);
        }

        $stored = $loader(self::OPTION_KEY, []);

        if (! is_array($stored)) {
            return $defaults;
        }

        return self::sanitize(array_merge($defaults, $stored));
    }
}
