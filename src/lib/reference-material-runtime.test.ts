import { selectReferenceExcerpts, toReferencePdfDownloadUrl } from './reference-material-runtime';

describe('reference-material-runtime', () => {
  it('converts a Google Drive file link into a direct download URL', () => {
    expect(
      toReferencePdfDownloadUrl(
        'https://drive.google.com/file/d/17II_a5abZ9Ocgw6iB-5FwWXVVaucaml_/view?usp=sharing',
      ),
    ).toBe('https://drive.google.com/uc?export=download&id=17II_a5abZ9Ocgw6iB-5FwWXVVaucaml_');
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
