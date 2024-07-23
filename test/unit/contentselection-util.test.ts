import type {
  RepresentationPreferences
} from '@solid/community-server';
import * as csutil from '../../src/contentselection-util';

describe('ContentSelection Utilities Unit Test', (): void => {
  const testMappings = [
    { mimeType: /text\/html/i, fileExtension: '.html' },
    { mimeType: /text\/csv/i, fileExtension: '.csv' },
    { mimeType: /text\/(turtle|\*)/i, fileExtension: '.ttl' },
    { mimeType: /application\/json(.*)/i, fileExtension: '.json' },
    { mimeType: /\*\/\*/i, fileExtension: '.ttl' }
  ];

  test('unknown type is not matched', () => {
    // given
    const unknownPreferences: RepresentationPreferences = {
      type: {
        'text/unknown': 1,
        'application/xml': 1
      }
    };
    // when
    const result = csutil.matchWithTypeMappings(unknownPreferences, testMappings);
    //then
    expect(result).toBeUndefined();
  });

  test('default is matched to TURTLE', () => {
    // given
    const defaultPreferences: RepresentationPreferences = {
      type: {'*/*': 1}
    };
    // when
    const result = csutil.matchWithTypeMappings(defaultPreferences, testMappings);
    //then
    expect(result).toBeDefined();
    expect(result?.fileExtension).toMatch('.ttl');
  });

  test('browser prefs are matched to HTML', () => {
    // given
    const browserPreferences: RepresentationPreferences = {
      type: {
        'text/html': 1,
        'application/xhtml+xml': 1,
        'image/avif': 1,
        'image/webp': 1,
        'image/apng': 1,
        'application/xml': 0.9,
        '*/*': 0.8,
        'application/signed-exchange': 0.7
      },
      encoding: { gzip: 1, deflate: 1, br: 1, zstd: 1 },
      language: { 'de-DE': 1, de: 0.9, 'en-US': 0.8, en: 0.7 }
    };
    // when
    const result = csutil.matchWithTypeMappings(browserPreferences, testMappings);
    // then
    expect(result).toBeDefined();
    expect(result?.fileExtension).toMatch('.html');
  });

  test('ordering of prefs is considered', () => {
    // given
    const orderedPreferences: RepresentationPreferences = {
      type: {
        'application/json': 1,
        'text/html': 1,
        '*/*': 0.8
      }
    };
    // when
    const result = csutil.matchWithTypeMappings(orderedPreferences, testMappings);
    //then
    expect(result).toBeDefined();
    expect(result?.fileExtension).toMatch('.json');
  });

})