import { describe, it, expect, beforeEach } from 'vitest';
import { XcodeXcstringsParser } from '../../parsers/xcode-xcstrings.parser.js';
import type { XcodeXcstringsParserOptionsType } from '../../parsers/parser.types.js';

describe('XcodeXcstringsParser', () => {
  let parser: XcodeXcstringsParser;

  beforeEach(() => {
    parser = new XcodeXcstringsParser();
  });

  describe('parse', () => {
    it('should parse simple string entries filtered by targetLocale', () => {
      const content = JSON.stringify({
        sourceLanguage: 'en',
        version: '1.0',
        strings: {
          app_name: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'My App' },
              },
              it: {
                stringUnit: { state: 'translated', value: 'La Mia App' },
              },
            },
          },
          hello: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'Hello' },
              },
              it: {
                stringUnit: { state: 'translated', value: 'Ciao' },
              },
            },
          },
        },
      });

      const result = parser.parse(content, {
        targetLocale: 'it',
        originalContent: content,
      });

      expect(result).toEqual({
        app_name: 'La Mia App',
        hello: 'Ciao',
      });
    });

    it('should return source language entries when no targetLocale is provided', () => {
      const content = JSON.stringify({
        sourceLanguage: 'en',
        version: '1.0',
        strings: {
          app_name: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'My App' },
              },
              fr: {
                stringUnit: { state: 'translated', value: 'Mon App' },
              },
            },
          },
        },
      });

      const result = parser.parse(content);

      expect(result).toEqual({
        app_name: 'My App',
      });
    });

    it('should return empty object for non-existent locale', () => {
      const content = JSON.stringify({
        sourceLanguage: 'en',
        version: '1.0',
        strings: {
          app_name: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'My App' },
              },
            },
          },
        },
      });

      const result = parser.parse(content, {
        targetLocale: 'ja',
        originalContent: content,
      });

      expect(result).toEqual({});
    });

    it('should parse plural variations flattened as key/form', () => {
      const content = JSON.stringify({
        sourceLanguage: 'en',
        version: '1.0',
        strings: {
          item_count: {
            localizations: {
              en: {
                variations: {
                  plural: {
                    one: {
                      stringUnit: { state: 'translated', value: '%lld item' },
                    },
                    other: {
                      stringUnit: { state: 'translated', value: '%lld items' },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const result = parser.parse(content, {
        targetLocale: 'en',
        originalContent: content,
      });

      expect(result).toEqual({
        'item_count/one': '%lld item',
        'item_count/other': '%lld items',
      });
    });

    it('should skip entries with shouldTranslate: false', () => {
      const content = JSON.stringify({
        sourceLanguage: 'en',
        version: '1.0',
        strings: {
          app_name: {
            shouldTranslate: false,
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'My App' },
              },
            },
          },
          hello: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'Hello' },
              },
            },
          },
        },
      });

      const result = parser.parse(content, {
        targetLocale: 'en',
        originalContent: content,
      });

      expect(result).toEqual({
        hello: 'Hello',
      });
    });

    it('should return empty object for empty strings object', () => {
      const content = JSON.stringify({
        sourceLanguage: 'en',
        version: '1.0',
        strings: {},
      });

      const result = parser.parse(content, {
        targetLocale: 'en',
        originalContent: content,
      });

      expect(result).toEqual({});
    });

    it('should return empty object for empty file', () => {
      const result = parser.parse('');

      expect(result).toEqual({});
    });

    it('should return empty object for invalid JSON', () => {
      const result = parser.parse('not valid json {{{');

      expect(result).toEqual({});
    });

    it('should handle Buffer input', () => {
      const content = JSON.stringify({
        sourceLanguage: 'en',
        version: '1.0',
        strings: {
          hello: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'Hello' },
              },
            },
          },
        },
      });

      const result = parser.parse(Buffer.from(content), {
        targetLocale: 'en',
        originalContent: content,
      });

      expect(result).toEqual({
        hello: 'Hello',
      });
    });

    it('should filter to only the specified locale when multiple locales exist', () => {
      const content = JSON.stringify({
        sourceLanguage: 'en',
        version: '1.0',
        strings: {
          greeting: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'Hello' },
              },
              fr: {
                stringUnit: { state: 'translated', value: 'Bonjour' },
              },
              de: {
                stringUnit: { state: 'translated', value: 'Hallo' },
              },
            },
          },
          farewell: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'Goodbye' },
              },
              fr: {
                stringUnit: { state: 'translated', value: 'Au revoir' },
              },
              de: {
                stringUnit: { state: 'translated', value: 'Auf Wiedersehen' },
              },
            },
          },
        },
      });

      const result = parser.parse(content, {
        targetLocale: 'fr',
        originalContent: content,
      });

      expect(result).toEqual({
        greeting: 'Bonjour',
        farewell: 'Au revoir',
      });
    });

    it('should skip entries that have no localizations for the target locale', () => {
      const content = JSON.stringify({
        sourceLanguage: 'en',
        version: '1.0',
        strings: {
          translated_key: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'English' },
              },
              fr: {
                stringUnit: { state: 'translated', value: 'French' },
              },
            },
          },
          untranslated_key: {
            localizations: {
              en: {
                stringUnit: { state: 'translated', value: 'Only English' },
              },
            },
          },
          no_localizations_key: {},
        },
      });

      const result = parser.parse(content, {
        targetLocale: 'fr',
        originalContent: content,
      });

      expect(result).toEqual({
        translated_key: 'French',
      });
    });
  });

  describe('serialize', () => {
    it('should update translations for a target locale', () => {
      const originalContent = JSON.stringify(
        {
          sourceLanguage: 'en',
          version: '1.0',
          strings: {
            hello: {
              localizations: {
                en: {
                  stringUnit: { state: 'translated', value: 'Hello' },
                },
              },
            },
          },
        },
        null,
        2
      );

      const data = { hello: 'Bonjour' };
      const options: XcodeXcstringsParserOptionsType = {
        targetLocale: 'fr',
        originalContent,
      };

      const result = JSON.parse(parser.serialize(data, options) as string);

      expect(result.strings.hello.localizations.fr).toEqual({
        stringUnit: { state: 'translated', value: 'Bonjour' },
      });
    });

    it('should preserve sourceLanguage and version fields', () => {
      const originalContent = JSON.stringify(
        {
          sourceLanguage: 'de',
          version: '2.0',
          strings: {
            hello: {
              localizations: {
                de: {
                  stringUnit: { state: 'translated', value: 'Hallo' },
                },
              },
            },
          },
        },
        null,
        2
      );

      const data = { hello: 'Hello' };
      const options: XcodeXcstringsParserOptionsType = {
        targetLocale: 'en',
        originalContent,
      };

      const result = JSON.parse(parser.serialize(data, options) as string);

      expect(result.sourceLanguage).toBe('de');
      expect(result.version).toBe('2.0');
    });

    it('should preserve other locales when updating one', () => {
      const originalContent = JSON.stringify(
        {
          sourceLanguage: 'en',
          version: '1.0',
          strings: {
            hello: {
              localizations: {
                en: {
                  stringUnit: { state: 'translated', value: 'Hello' },
                },
                de: {
                  stringUnit: { state: 'translated', value: 'Hallo' },
                },
              },
            },
          },
        },
        null,
        2
      );

      const data = { hello: 'Bonjour' };
      const options: XcodeXcstringsParserOptionsType = {
        targetLocale: 'fr',
        originalContent,
      };

      const result = JSON.parse(parser.serialize(data, options) as string);

      expect(result.strings.hello.localizations.en.stringUnit.value).toBe('Hello');
      expect(result.strings.hello.localizations.de.stringUnit.value).toBe('Hallo');
      expect(result.strings.hello.localizations.fr.stringUnit.value).toBe('Bonjour');
    });

    it('should preserve extractionState and comment metadata', () => {
      const originalContent = JSON.stringify(
        {
          sourceLanguage: 'en',
          version: '1.0',
          strings: {
            hello: {
              extractionState: 'manual',
              comment: 'Greeting shown on home screen',
              localizations: {
                en: {
                  stringUnit: { state: 'translated', value: 'Hello' },
                },
              },
            },
          },
        },
        null,
        2
      );

      const data = { hello: 'Ciao' };
      const options: XcodeXcstringsParserOptionsType = {
        targetLocale: 'it',
        originalContent,
      };

      const result = JSON.parse(parser.serialize(data, options) as string);

      expect(result.strings.hello.extractionState).toBe('manual');
      expect(result.strings.hello.comment).toBe('Greeting shown on home screen');
    });

    it('should preserve shouldTranslate: false entries unchanged', () => {
      const originalContent = JSON.stringify(
        {
          sourceLanguage: 'en',
          version: '1.0',
          strings: {
            app_id: {
              shouldTranslate: false,
              localizations: {
                en: {
                  stringUnit: { state: 'translated', value: 'com.example.app' },
                },
              },
            },
            hello: {
              localizations: {
                en: {
                  stringUnit: { state: 'translated', value: 'Hello' },
                },
              },
            },
          },
        },
        null,
        2
      );

      const data = { hello: 'Hola' };
      const options: XcodeXcstringsParserOptionsType = {
        targetLocale: 'es',
        originalContent,
      };

      const result = JSON.parse(parser.serialize(data, options) as string);

      expect(result.strings.app_id.shouldTranslate).toBe(false);
      expect(result.strings.app_id.localizations.en.stringUnit.value).toBe('com.example.app');
      // shouldTranslate: false entries should not have es locale added or removed
      expect(result.strings.app_id.localizations.es).toBeUndefined();
    });

    it('should set stringUnit state to "translated" for new translations', () => {
      const originalContent = JSON.stringify(
        {
          sourceLanguage: 'en',
          version: '1.0',
          strings: {
            hello: {
              localizations: {
                en: {
                  stringUnit: { state: 'translated', value: 'Hello' },
                },
              },
            },
          },
        },
        null,
        2
      );

      const data = { hello: 'Bonjour' };
      const options: XcodeXcstringsParserOptionsType = {
        targetLocale: 'fr',
        originalContent,
      };

      const result = JSON.parse(parser.serialize(data, options) as string);

      expect(result.strings.hello.localizations.fr.stringUnit.state).toBe('translated');
    });

    it('should handle plural serialization by unflattening key/form back to variations.plural', () => {
      const originalContent = JSON.stringify(
        {
          sourceLanguage: 'en',
          version: '1.0',
          strings: {
            item_count: {
              localizations: {
                en: {
                  variations: {
                    plural: {
                      one: {
                        stringUnit: { state: 'translated', value: '%lld item' },
                      },
                      other: {
                        stringUnit: { state: 'translated', value: '%lld items' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        null,
        2
      );

      const data = {
        'item_count/one': '%lld elemento',
        'item_count/other': '%lld elementos',
      };
      const options: XcodeXcstringsParserOptionsType = {
        targetLocale: 'es',
        originalContent,
      };

      const result = JSON.parse(parser.serialize(data, options) as string);

      expect(result.strings.item_count.localizations.es).toEqual({
        variations: {
          plural: {
            one: {
              stringUnit: { state: 'translated', value: '%lld elemento' },
            },
            other: {
              stringUnit: { state: 'translated', value: '%lld elementos' },
            },
          },
        },
      });
    });

    it('should preserve JSON indentation', () => {
      const originalContent = JSON.stringify(
        {
          sourceLanguage: 'en',
          version: '1.0',
          strings: {
            hello: {
              localizations: {
                en: {
                  stringUnit: { state: 'translated', value: 'Hello' },
                },
              },
            },
          },
        },
        null,
        4
      );

      const data = { hello: 'Bonjour' };
      const options: XcodeXcstringsParserOptionsType = {
        targetLocale: 'fr',
        originalContent,
      };

      const result = parser.serialize(data, options) as string;

      // 4-space indentation should be detected and preserved
      expect(result).toContain('    "sourceLanguage"');
    });

    it('should create new locale entries that do not exist yet', () => {
      const originalContent = JSON.stringify(
        {
          sourceLanguage: 'en',
          version: '1.0',
          strings: {
            hello: {
              localizations: {
                en: {
                  stringUnit: { state: 'translated', value: 'Hello' },
                },
              },
            },
          },
        },
        null,
        2
      );

      const data = { hello: 'Hej' };
      const options: XcodeXcstringsParserOptionsType = {
        targetLocale: 'sv',
        originalContent,
      };

      const result = JSON.parse(parser.serialize(data, options) as string);

      expect(result.strings.hello.localizations.sv).toEqual({
        stringUnit: { state: 'translated', value: 'Hej' },
      });
      // Original locale should still be present
      expect(result.strings.hello.localizations.en.stringUnit.value).toBe('Hello');
    });

    it('should remove deleted keys from target locale', () => {
      const originalContent = JSON.stringify(
        {
          sourceLanguage: 'en',
          version: '1.0',
          strings: {
            hello: {
              localizations: {
                en: {
                  stringUnit: { state: 'translated', value: 'Hello' },
                },
                fr: {
                  stringUnit: { state: 'translated', value: 'Bonjour' },
                },
              },
            },
            goodbye: {
              localizations: {
                en: {
                  stringUnit: { state: 'translated', value: 'Goodbye' },
                },
                fr: {
                  stringUnit: { state: 'translated', value: 'Au revoir' },
                },
              },
            },
          },
        },
        null,
        2
      );

      // Only include hello, not goodbye -- goodbye should be removed from fr
      const data = { hello: 'Bonjour' };
      const options: XcodeXcstringsParserOptionsType = {
        targetLocale: 'fr',
        originalContent,
      };

      const result = JSON.parse(parser.serialize(data, options) as string);

      expect(result.strings.hello.localizations.fr.stringUnit.value).toBe('Bonjour');
      // goodbye's fr localization should be removed
      expect(result.strings.goodbye.localizations.fr).toBeUndefined();
      // en localization should remain
      expect(result.strings.goodbye.localizations.en.stringUnit.value).toBe('Goodbye');
    });

    it('should throw error when originalContent is missing', () => {
      const data = { hello: 'Bonjour' };

      expect(() => {
        parser.serialize(data, {
          targetLocale: 'fr',
          originalContent: '',
        } as XcodeXcstringsParserOptionsType);
      }).toThrow('Original content is required');
    });
  });

  describe('getFallback', () => {
    it('should return a valid empty xcstrings JSON structure', () => {
      const fallback = parser.getFallback();
      const parsed = JSON.parse(fallback);

      expect(parsed.sourceLanguage).toBe('en');
      expect(parsed.strings).toEqual({});
      expect(parsed.version).toBe('1.0');
    });
  });
});
