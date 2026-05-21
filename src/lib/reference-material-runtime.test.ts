import { selectReferenceExcerpts, toReferencePdfDownloadUrl } from './reference-material-runtime';

describe('reference-material-runtime', () => {
  it('converts a Google Drive file link into a direct download URL', () => {
    expect(
      toReferencePdfDownloadUrl(
        'https://drive.google.com/file/d/17II_a5abZ9Ocgw6iB-5FwWXVVaucaml_/view?usp=sharing',
      ),
    ).toBe('https://drive.google.com/uc?export=download&id=17II_a5abZ9Ocgw6iB-5FwWXVVaucaml_');
  });

  it('fetches reference PDFs without using the Next.js data cache', async () => {
    process.env.REFERENCE_SOURCE_PDF_URL = 'https://example.com/reference.pdf';
    process.env.REFERENCE_DRAFT_PDF_URL = '';

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: fetchMock,
    });

    jest.resetModules();
    jest.doMock('pdf-parse', () => ({
      __esModule: true,
      default: jest.fn().mockResolvedValue({ text: 'Paragraph one\n\nParagraph two' }),
    }));

    const { buildRuntimeReferencePromptContext } = await import('./reference-material-runtime');

    await buildRuntimeReferencePromptContext('Paragraph one');

    expect(fetchMock).toHaveBeenCalledWith('https://example.com/reference.pdf', {
      cache: 'no-store',
    });
  });

  it('prefers the most relevant excerpts for the current source text', () => {
    const referenceText = [
      'Morning light lay cold over the quay while the harbor workers waited in silence for the ferry horn to return across the water.',
      'The orchard road stayed warm and dusty throughout the afternoon, far from the coast and the harbor.',
      'By the railing, she waited for the fog to lift above the harbor water while the lamps stayed dim behind her.',
    ].join('\n\n');

    const excerpts = selectReferenceExcerpts(referenceText, 'She waited by the harbor railing.');

    expect(excerpts[0]).toContain('By the railing');
    expect(excerpts.length).toBeGreaterThan(0);
    expect(excerpts.length).toBeLessThanOrEqual(3);
  });
});
