import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { extractLocaleFromPath, extractAllLocalesFromProject } from '#utils/locale.js';
import { ParserFactory } from '../../parsers/parser.factory.js';
import * as pathUtils from '#utils/path.js';

// Mock dependencies
vi.mock('path', () => ({
  default: {
    relative: vi.fn((from: string, to: string) => {
      if (to.startsWith(from)) {
        return to.slice(from.length + 1);
      }
      return to;
    }),
  },
}));

vi.mock('#utils/path.js', () => ({
  extractLocaleFromFilename: vi.fn(),
  searchPaths: vi.fn(),
  readSafe: vi.fn(),
}));

vi.mock('../../parsers/parser.factory.js');

describe('locale utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, 'cwd').mockReturnValue('/mock/project');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('extractLocaleFromPath', () => {
    it('should extract locales from separates JSON files for each locale', async () => {
      const source = 'en';
      const filePath = 'src/locales/en.json';
      const filePath2 = 'src/locales/it.json';
      const fileContent = '{"key": "value1","key2": "value2"}';
      const parsedContent = {
        key: 'value1',
        key2: 'value2',
      };
      vi.mocked(ParserFactory).mockImplementation(function () {
        return {
          parse: vi.fn().mockReturnValue(parsedContent),
        } as any;
      });
      vi.mocked(pathUtils.extractLocaleFromFilename)
        .mockReturnValueOnce('en')
        .mockReturnValueOnce('it');
      vi.mocked(pathUtils.readSafe).mockResolvedValue(fileContent);
      vi.mocked(pathUtils.searchPaths).mockResolvedValue([filePath, filePath2]);

      const result = await extractLocaleFromPath(source);

      expect(result).toEqual(['it']);
    });

    it('should extract locales from i18n.ts file', async () => {
      const source = 'en';
      const fileContent = 'const messages = { "en": {"key": "value1"}, "it": {"key": "value2"} }';
      const parsedContent = {
        en: { key: 'value1' },
        it: { key: 'value2' },
      };
      const filePaths = ['src/i18n.ts'];
      vi.mocked(pathUtils.searchPaths).mockResolvedValue(filePaths);
      const mockParse = vi.fn().mockReturnValue(parsedContent);
      vi.mocked(ParserFactory).mockImplementation(function () {
        return {
          parse: mockParse,
        } as any;
      });
      vi.mocked(pathUtils.readSafe).mockResolvedValue(fileContent);

      const result = await extractLocaleFromPath(source);

      expect(result).toEqual(['it']);
      expect(pathUtils.readSafe).toHaveBeenCalledWith(filePaths[0]);
      expect(ParserFactory).toHaveBeenCalledWith(filePaths[0]);
      expect(mockParse).toHaveBeenCalledWith(fileContent);
    });

    it('should filter out source locale when extracting from i18n.ts', async () => {
      const source = 'en';
      const filePaths = ['src/i18n.ts'];
      const fileContent = 'const messages = { "en": {"key": "value1"}, "it": {"key": "value2"} }';
      const parsedContent = {
        en: { key: 'value1' },
        it: { key: 'value2' },
      };
      vi.mocked(ParserFactory).mockImplementation(function () {
        return {
          parse: vi.fn().mockReturnValue(parsedContent),
        } as any;
      });
      vi.mocked(pathUtils.searchPaths).mockResolvedValue(filePaths);
      vi.mocked(pathUtils.readSafe).mockResolvedValue(fileContent);

      const result = await extractLocaleFromPath(source);

      expect(result).toContain('it');
      expect(result).not.toContain('en');
    });

    it('should extract locales from .vue files in project', async () => {
      const source = 'en';
      const filePaths = ['src/components/Component.vue'];
      const fileContent = '<i18n> { "en": {"key": "value1"}, "fr": {"key": "value2"} } </i18n>';
      const parsedContent = {
        en: { key: 'value1' },
        fr: { key: 'value2' },
      };
      vi.mocked(ParserFactory).mockImplementation(function () {
        return {
          parse: vi.fn().mockReturnValue(parsedContent),
        } as any;
      });
      vi.mocked(pathUtils.searchPaths).mockResolvedValue(filePaths);
      vi.mocked(pathUtils.readSafe).mockResolvedValue(fileContent);

      const result = await extractLocaleFromPath(source);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should filter out source locale when extracting from .vue files', async () => {
      const source = 'en';
      const filePaths = ['src/components/Component.vue'];
      const fileContent = '<i18n> { "en": {"key": "value1"}, "fr": {"key": "value2"} } </i18n>';
      const parsedContent = {
        en: { key: 'value1' },
        fr: { key: 'value2' },
      };
      vi.mocked(ParserFactory).mockImplementation(function () {
        return {
          parse: vi.fn().mockReturnValue(parsedContent),
        } as any;
      });
      vi.mocked(pathUtils.searchPaths).mockResolvedValue(filePaths);
      vi.mocked(pathUtils.readSafe).mockResolvedValue(fileContent);

      const result = await extractLocaleFromPath(source);

      expect(result).toContain('fr');
      expect(result).not.toContain('en');
    });

    it('should extract locales from JSON files using filename', async () => {
      const source = 'en';
      const filePaths = ['src/locales/en.json', 'src/locales/it.json'];
      const relativePath1 = 'src/locales/en.json';
      const relativePath2 = 'src/locales/it.json';
      vi.mocked(pathUtils.searchPaths).mockResolvedValue(filePaths);
      vi.mocked(pathUtils.extractLocaleFromFilename)
        .mockReturnValueOnce('en')
        .mockReturnValueOnce('it');
      vi.mocked(path.relative)
        .mockReturnValueOnce(relativePath1)
        .mockReturnValueOnce(relativePath2);

      const result = await extractLocaleFromPath(source);

      expect(result).toContain('it');
      expect(result).not.toContain('en');
      expect(pathUtils.extractLocaleFromFilename).toHaveBeenCalled();
    });

    it('should extract locales from PO files', async () => {
      const source = 'en';
      const filePaths = ['languages/en.po', 'languages/it.po'];
      const fileContent = 'msgid "greeting"\nmsgstr "Hello, world!"';
      vi.mocked(pathUtils.searchPaths).mockResolvedValue(filePaths);
      vi.mocked(pathUtils.extractLocaleFromFilename)
        .mockReturnValueOnce('en')
        .mockReturnValueOnce('it');
      vi.mocked(pathUtils.readSafe)
        .mockResolvedValueOnce(fileContent)
        .mockResolvedValueOnce(fileContent);
      vi.mocked(ParserFactory).mockImplementation(function () {
        return {
          parse: vi.fn().mockReturnValue({ en: { greeting: 'Hello, world!' } }) as any,
        } as any;
      });

      const result = await extractLocaleFromPath(source);

      expect(result).toEqual(['it']);
    });

    it('should extract locales from path parts', async () => {
      const source = 'en';
      const filePaths = ['src/i18n/en/pages/home.json', 'src/i18n/it/pages/home.json'];
      const relativePath1 = 'src/i18n/en/pages/home.json';
      const relativePath2 = 'src/i18n/it/pages/home.json';
      vi.mocked(pathUtils.searchPaths).mockResolvedValue(filePaths);
      vi.mocked(pathUtils.extractLocaleFromFilename).mockReturnValue(null);
      vi.mocked(path.relative)
        .mockReturnValueOnce(relativePath1)
        .mockReturnValueOnce(relativePath2);

      const result = await extractLocaleFromPath(source);

      expect(result).toContain('it');
      expect(result).not.toContain('en'); // Should filter out source locale
    });

    it('should handle complex locale codes', async () => {
      const source = 'en';
      const filePaths = ['src/locales/en-US.json', 'src/locales/it-IT.json'];
      const relativePath1 = 'src/locales/en-US.json';
      const relativePath2 = 'src/locales/it-IT.json';
      vi.mocked(pathUtils.searchPaths).mockResolvedValue(filePaths);
      vi.mocked(pathUtils.extractLocaleFromFilename)
        .mockReturnValueOnce('en-US')
        .mockReturnValueOnce('it-IT');
      vi.mocked(path.relative)
        .mockReturnValueOnce(relativePath1)
        .mockReturnValueOnce(relativePath2);

      const result = await extractLocaleFromPath(source);

      expect(result).toContain('it-IT');
      expect(result).toContain('en-US'); // en-US is different from 'en'
    });

    it('should return empty array when no locales found', async () => {
      const source = 'en';
      const filePaths: string[] = [];
      vi.mocked(pathUtils.searchPaths).mockResolvedValue(filePaths);

      const result = await extractLocaleFromPath(source);

      expect(result).toEqual([]);
    });

    it('should handle parser errors gracefully', async () => {
      const source = 'en';
      const fileContent = 'invalid content';
      const mockParser = {
        parse: vi.fn().mockImplementation(() => {
          throw new Error('Parse error');
        }),
      };
      vi.mocked(ParserFactory).mockReturnValue(mockParser as any);
      vi.mocked(pathUtils.readSafe).mockResolvedValue(fileContent);

      const result = await extractLocaleFromPath(source);

      expect(result).toEqual([]);
    });

    it('should handle readSafe errors gracefully', async () => {
      const source = 'en';
      vi.mocked(pathUtils.readSafe).mockRejectedValue(new Error('File not found'));

      const result = await extractLocaleFromPath(source);

      expect(result).toEqual([]);
    });

    it('should handle nested locale keys correctly', async () => {
      const source = 'en';
      const fileContent =
        'const messages = { "en": {"nested": {"deep": {"key": "value1"}}}, "it": {"other": {"key": "value2"}}}';
      const parsedContent = {
        en: { nested: { deep: { key: 'value1' } } },
        it: { other: { key: 'value2' } },
      };
      vi.mocked(ParserFactory).mockImplementation(function () {
        return {
          parse: vi.fn().mockReturnValue(parsedContent),
        } as any;
      });
      vi.mocked(pathUtils.searchPaths).mockResolvedValue(['src/i18n.ts']);
      vi.mocked(pathUtils.readSafe).mockResolvedValue(fileContent);

      const result = await extractLocaleFromPath(source);

      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('it');
    });

    it('should ignore invalid locale codes', async () => {
      const source = 'en';
      const fileContent = 'const messages = { "en": {"key": "value1"}, "test": {"key": "value2"} }';
      const parsedContent = {
        en: { key: 'value1' },
        test: { key: 'value2' },
      };
      vi.mocked(ParserFactory).mockImplementation(function () {
        return {
          parse: vi.fn().mockReturnValue(parsedContent),
        } as any;
      });
      vi.mocked(pathUtils.searchPaths).mockResolvedValue(['src/i18n.ts']);
      vi.mocked(pathUtils.readSafe).mockResolvedValue(fileContent);

      const result = await extractLocaleFromPath(source);

      expect(result).toEqual([]);
    });
  });

  describe('extractAllLocalesFromProject', () => {
    it('should extract all locales from i18n.ts files', async () => {
      const filePaths = ['src/i18n.ts'];
      const fileContent = 'const messages = { "en": {"key": "value1"}, "it": {"key": "value2"} }';
      const parsedContent = {
        en: { key: 'value1' },
        it: { key: 'value2' },
      };
      vi.mocked(ParserFactory).mockImplementation(function () {
        return {
          parse: vi.fn().mockReturnValue(parsedContent),
        } as any;
      });
      vi.mocked(pathUtils.searchPaths).mockResolvedValue(filePaths);
      vi.mocked(pathUtils.readSafe).mockResolvedValue(fileContent);

      const result = await extractAllLocalesFromProject();

      expect(result).toContain('en');
      expect(result).toContain('it');
    });
    it('should extract all locales from .vue files', async () => {
      const filePaths = ['src/components/Component.vue'];
      const fileContent = '<i18n> { "en": {"key": "value1"}, "fr": {"key": "value2"} } </i18n>';
      const parsedContent = {
        en: { key: 'value1' },
        fr: { key: 'value2' },
      };
      vi.mocked(ParserFactory).mockImplementation(function () {
        return {
          parse: vi.fn().mockReturnValue(parsedContent),
        } as any;
      });
      vi.mocked(pathUtils.searchPaths).mockResolvedValue(filePaths);
      vi.mocked(pathUtils.readSafe).mockResolvedValue(fileContent);

      const result = await extractAllLocalesFromProject();

      expect(result).toContain('en');
      expect(result).toContain('fr');
    });

    it('should return unique locales', async () => {
      const filePaths = ['src/i18n/en/pages/home.json', 'src/i18n/en/pages/contact.json'];
      const fileContent1 = '{"key1": "value1"}';
      const fileContent2 = '{"key2": "value2"}';
      const parsedContent1 = { key1: 'value1' };
      const parsedContent2 = { key2: 'value2' };
      vi.mocked(pathUtils.searchPaths).mockResolvedValue(filePaths);
      vi.mocked(pathUtils.readSafe)
        .mockResolvedValueOnce(fileContent1)
        .mockResolvedValueOnce(fileContent2);
      vi.mocked(ParserFactory).mockImplementation(function () {
        return {
          parse: vi.fn().mockReturnValue(parsedContent1),
        } as any;
      });
      vi.mocked(ParserFactory).mockImplementation(function () {
        return {
          parse: vi.fn().mockReturnValue(parsedContent2),
        } as any;
      });
      const result = await extractAllLocalesFromProject();
      expect(result).toContain('en');
      // Check that 'en' appears only once
      expect(result.filter((l) => l === 'en').length).toBe(1);
    });

    it('should return empty array when no locales found', async () => {
      const filePaths: string[] = [];
      vi.mocked(pathUtils.searchPaths).mockResolvedValue(filePaths);

      const result = await extractAllLocalesFromProject();

      expect(result).toEqual([]);
    });

    it('should handle parser errors gracefully', async () => {
      const filePaths = ['src/i18n/en.json'];
      const fileContent = 'invalid content';
      const mockParser = {
        parse: vi.fn().mockImplementation(() => {
          throw new Error('Parse error');
        }),
      };
      vi.mocked(pathUtils.searchPaths).mockResolvedValue(filePaths);
      vi.mocked(pathUtils.readSafe).mockResolvedValue(fileContent);
      vi.mocked(ParserFactory).mockReturnValue(mockParser as any);

      const result = await extractAllLocalesFromProject();

      expect(result).toEqual([]);
    });

    it('should handle readSafe errors gracefully', async () => {
      const filePaths = ['src/i18n.ts'];
      vi.mocked(pathUtils.searchPaths).mockResolvedValue(filePaths);
      vi.mocked(pathUtils.readSafe).mockRejectedValue(new Error('File not found'));
      vi.mocked(ParserFactory).mockImplementation(function () {
        return {
          parse: vi.fn().mockReturnValue(undefined),
        } as any;
      });

      const result = await extractAllLocalesFromProject();

      expect(result).toEqual([]);
    });

    it('should skip non-i18n .ts files', async () => {
      const filePaths = ['src/components/Component.ts', 'src/utils/helper.ts'];
      vi.mocked(pathUtils.searchPaths).mockResolvedValue(filePaths);
      vi.mocked(pathUtils.readSafe).mockResolvedValue('export const foo = "bar"');
      vi.mocked(ParserFactory).mockImplementation(function () {
        return {
          parse: vi.fn().mockReturnValue({}),
        } as any;
      });

      const result = await extractAllLocalesFromProject();

      expect(result).toEqual([]);
      expect(pathUtils.readSafe).not.toHaveBeenCalled();
    });
  });

  describe('non-i18n TS file filtering', () => {
    it('extractLocaleFromPath should skip non-i18n .ts files', async () => {
      const source = 'en';
      const filePaths = ['src/components/Component.ts', 'src/utils/helper.ts'];
      vi.mocked(pathUtils.searchPaths).mockResolvedValue(filePaths);
      vi.mocked(pathUtils.readSafe).mockResolvedValue('export type Foo = { bar: string }');
      vi.mocked(ParserFactory).mockImplementation(function () {
        return {
          parse: vi.fn().mockImplementation(() => {
            throw new Error('Missing initializer in const declaration');
          }),
        } as any;
      });

      const result = await extractLocaleFromPath(source);

      expect(result).toEqual([]);
      expect(pathUtils.readSafe).not.toHaveBeenCalled();
    });

    it('extractLocaleFromPath should skip non-i18n .ts files even with locale directory components', async () => {
      const source = 'en';
      const filePaths = ['src/en/foo.ts', 'src/fr/bar.ts'];
      vi.mocked(pathUtils.searchPaths).mockResolvedValue(filePaths);

      const result = await extractLocaleFromPath(source);

      expect(result).toEqual([]);
      expect(pathUtils.readSafe).not.toHaveBeenCalled();
    });

    it('extractAllLocalesFromProject should skip non-i18n .ts files even with locale directory components', async () => {
      const filePaths = ['src/en/foo.ts', 'src/fr/bar.ts'];
      vi.mocked(pathUtils.searchPaths).mockResolvedValue(filePaths);

      const result = await extractAllLocalesFromProject();

      expect(result).toEqual([]);
      expect(pathUtils.readSafe).not.toHaveBeenCalled();
    });

    it('extractLocaleFromPath should still parse i18n.ts files', async () => {
      const source = 'en';
      const filePaths = ['src/locales/i18n.ts'];
      const fileContent = 'const messages = { "en": {"key": "value1"}, "fr": {"key": "value2"} }';
      const parsedContent = {
        en: { key: 'value1' },
        fr: { key: 'value2' },
      };
      vi.mocked(pathUtils.searchPaths).mockResolvedValue(filePaths);
      vi.mocked(pathUtils.readSafe).mockResolvedValue(fileContent);
      vi.mocked(ParserFactory).mockImplementation(function () {
        return {
          parse: vi.fn().mockReturnValue(parsedContent),
        } as any;
      });

      const result = await extractLocaleFromPath(source);

      expect(result).toContain('fr');
      expect(result).not.toContain('en');
      expect(pathUtils.readSafe).toHaveBeenCalledWith(filePaths[0]);
    });
  });
});
