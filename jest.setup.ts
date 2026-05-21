import '@testing-library/jest-dom';

const originalFetch = globalThis.fetch;

function createMatchMedia(matches: boolean): Window['matchMedia'] {
  return (query: string): MediaQueryList => ({
    matches,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  });
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: createMatchMedia(false),
  });
}

declare global {
  // Allow explicit per-test opt-in for real network usage.
  var __ALLOW_NETWORK_IN_TESTS__: boolean | undefined;
}

beforeEach(() => {
  globalThis.__ALLOW_NETWORK_IN_TESTS__ = false;

  globalThis.fetch = jest.fn(async (...args: Parameters<typeof fetch>) => {
    if (globalThis.__ALLOW_NETWORK_IN_TESTS__) {
      if (originalFetch) {
        return originalFetch(...args);
      }

      throw new Error('No native fetch implementation is available in this test environment.');
    }

    throw new Error(
      [
        'Unexpected network call in unit test.',
        'Mock global fetch in this test, or set globalThis.__ALLOW_NETWORK_IN_TESTS__ = true for intentional integration coverage.',
      ].join(' '),
    );
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.__ALLOW_NETWORK_IN_TESTS__ = false;
});
