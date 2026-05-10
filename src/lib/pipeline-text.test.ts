import { splitByParagraphs, splitBySceneMarkers } from './pipeline-text';

describe('pipeline-text', () => {
  it('preserves internal line breaks when splitting paragraphs', () => {
    const sourceText = ['First line', 'Second line', '', 'Third line'].join('\n');

    expect(splitByParagraphs(sourceText)).toEqual(['First line\nSecond line', 'Third line']);
  });

  it('preserves internal line breaks when splitting scene markers', () => {
    const sourceText = ['First line', 'Second line', '', '***', '', 'Third line'].join('\n');

    expect(splitBySceneMarkers(sourceText)).toEqual(['First line\nSecond line', 'Third line']);
  });
});
