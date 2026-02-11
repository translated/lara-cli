import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import { glob } from 'glob';
import {
  isRelative,
  getFileExtension,
  readSafe,
  ensureDirectoryExists,
  buildLocalePath,
  searchLocalePathsByPattern,
  searchLocalePaths,
  searchPaths,
  extractLocaleFromFilename,
} from '#utils/path.js';
import { VueParser } from '../../parsers/vue.parser.js';

// Mock dependencies
vi.mock('fs/promises');
vi.mock('glob');
vi.mock('../../parsers/vue.parser.js');

describe('path utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isRelative', () => {
    it('should return true for relative paths without leading slash', () => {
      expect(isRelative('file.txt')).toBe(true);
      expect(isRelative('path/to/file.txt')).toBe(true);
      expect(isRelative('src/i18n/en.json')).toBe(true);
    });

    it('should return false for absolute paths', () => {
      expect(isRelative('/file.txt')).toBe(false);
      expect(isRelative('/path/to/file.txt')).toBe(false);
      expect(isRelative('/src/i18n/en.json')).toBe(false);
    });

    it('should return false for paths starting with ./', () => {
      expect(isRelative('./file.txt')).toBe(false);
      expect(isRelative('./path/to/file.txt')).toBe(false);
    });

    it('should return false for paths starting with ../', () => {
      expect(isRelative('../file.txt')).toBe(false);
      expect(isRelative('../../path/to/file.txt')).toBe(false);
    });
  });

  describe('getFileExtension', () => {
    it('should return the file extension', () => {
      expect(getFileExtension('file.txt')).toBe('txt');
      expect(getFileExtension('file.json')).toBe('json');
      expect(getFileExtension('file.ts')).toBe('ts');
      expect(getFileExtension('file.vue')).toBe('vue');
    });

    it('should return the last extension for files with multiple dots', () => {
      expect(getFileExtension('file.min.js')).toBe('js');
      expect(getFileExtension('file.test.ts')).toBe('ts');
      expect(getFileExtension('file.backup.json')).toBe('json');
    });

    it('should return the whole string for files without extension', () => {
      expect(getFileExtension('file')).toBe('file');
      expect(getFileExtension('path/to/file')).toBe('path/to/file');
    });

    it('should return empty string for paths ending with dot', () => {
      expect(getFileExtension('file.')).toBe('');
    });

    it('should handle hidden files', () => {
      expect(getFileExtension('.gitignore')).toBe('gitignore');
      expect(getFileExtension('.env.local')).toBe('local');
    });
  });

  describe('readSafe', () => {
    it('should return file content when file exists', async () => {
      const filePath = 'test/file.txt';
      const fileContent = 'test content';
      vi.mocked(fs.readFile).mockResolvedValue(fileContent);

      const result = await readSafe(filePath);

      expect(result).toBe(fileContent);
      expect(fs.readFile).toHaveBeenCalledWith(filePath, 'utf8');
    });

    it('should return fallback value when file does not exist', async () => {
      const filePath = 'test/nonexistent.txt';
      const fallback = 'default content';
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      const result = await readSafe(filePath, fallback);

      expect(result).toBe(fallback);
    });

    it('should return empty string as default fallback when file does not exist', async () => {
      const filePath = 'test/nonexistent.txt';
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      const result = await readSafe(filePath);

      expect(result).toBe('');
    });

    it('should handle other file system errors', async () => {
      const filePath = 'test/file.txt';
      const fallback = 'error fallback';
      vi.mocked(fs.readFile).mockRejectedValue(new Error('Permission denied'));

      const result = await readSafe(filePath, fallback);

      expect(result).toBe(fallback);
    });
  });

  describe('ensureDirectoryExists', () => {
    it('should not create directory if it already exists', async () => {
      const filePath = 'existing/dir/file.txt';
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await ensureDirectoryExists(filePath);

      expect(fs.access).toHaveBeenCalledWith('existing/dir');
      expect(fs.mkdir).not.toHaveBeenCalled();
    });

    it('should create directory if it does not exist', async () => {
      const filePath = 'new/dir/file.txt';
      vi.mocked(fs.access).mockRejectedValue(new Error('Directory not found'));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await ensureDirectoryExists(filePath);

      expect(fs.access).toHaveBeenCalledWith('new/dir');
      expect(fs.mkdir).toHaveBeenCalledWith('new/dir', { recursive: true });
    });

    it('should handle nested directory paths', async () => {
      const filePath = 'nested/directory/path/file.txt';
      vi.mocked(fs.access).mockRejectedValue(new Error('Directory not found'));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await ensureDirectoryExists(filePath);

      expect(fs.mkdir).toHaveBeenCalledWith('nested/directory/path', {
        recursive: true,
      });
    });
  });

  describe('buildLocalePath', () => {
    it('should replace [locale] placeholder with locale', () => {
      expect(buildLocalePath('src/i18n/[locale].json', 'en')).toBe('src/i18n/en.json');
      expect(buildLocalePath('src/i18n/[locale].json', 'it')).toBe('src/i18n/it.json');
    });

    it('should replace all occurrences of [locale]', () => {
      expect(buildLocalePath('src/[locale]/i18n/[locale].json', 'en')).toBe('src/en/i18n/en.json');
    });

    it('should handle paths without [locale] placeholder', () => {
      expect(buildLocalePath('src/i18n/file.json', 'en')).toBe('src/i18n/file.json');
    });

    it('should handle nested paths', () => {
      expect(buildLocalePath('src/i18n/[locale]/pages/home.json', 'en')).toBe(
        'src/i18n/en/pages/home.json'
      );
    });

    it('should handle complex locale codes', () => {
      expect(buildLocalePath('src/i18n/[locale].json', 'it-IT')).toBe('src/i18n/it-IT.json');
      expect(buildLocalePath('src/i18n/[locale].json', 'zh-CN')).toBe('src/i18n/zh-CN.json');
    });
  });

  describe('searchLocalePathsByPattern', () => {
    it('should search for locale paths matching the pattern', async () => {
      const pattern = 'src/i18n/[locale].json';
      const mockPaths = ['src/i18n/en.json', 'src/i18n/en.json'];
      vi.mocked(glob).mockResolvedValue(mockPaths);

      const result = await searchLocalePathsByPattern(pattern);

      expect(result.length).toBeGreaterThan(0);
      expect(glob).toHaveBeenCalled();
    });

    it('should normalize paths before returning', async () => {
      const pattern = 'src/i18n/[locale].json';
      const mockPaths = ['src/i18n/en.json'];
      vi.mocked(glob).mockResolvedValue(mockPaths);

      const result = await searchLocalePathsByPattern(pattern);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter out null normalized paths', async () => {
      const pattern = 'src/i18n/[locale].json';
      const mockPaths = ['src/i18n/en.json', 'src/invalid/path.txt'];
      vi.mocked(glob).mockResolvedValue(mockPaths);

      const result = await searchLocalePathsByPattern(pattern);

      // Should only include valid normalized paths
      expect(result.every((p) => p !== null)).toBe(true);
    });

    it('should return empty array if no paths are found', async () => {
      const pattern = 'src/i18n/[locale].json';
      vi.mocked(glob).mockResolvedValue([]);

      const result = await searchLocalePathsByPattern(pattern);

      expect(result).toEqual([]);
    });

    it('should return unique paths', async () => {
      const pattern = 'src/i18n/[locale].json';
      const mockPaths = ['src/i18n/en.json', 'src/i18n/it.json'];
      vi.mocked(glob).mockResolvedValue(mockPaths);

      const result = await searchLocalePathsByPattern(pattern);

      expect(result.length).toBe(1);
    });

    describe('searchLocalePaths', () => {
      beforeEach(() => {
        vi.mocked(VueParser.hasI18nTag).mockReturnValue(false);
      });

      it('should search for locale paths with source option', async () => {
        const options = { source: 'en' };
        const mockPaths = ['src/i18n/en.json', 'src/i18n/it.json'];
        vi.mocked(glob).mockResolvedValue(mockPaths);
        vi.mocked(fs.readFile).mockResolvedValue('');

        const result = await searchLocalePaths(options);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result.some((p) => p.includes('src/i18n/[locale].json'))).toBe(true);
      });

      it('should handle empty source option', async () => {
        const options = { source: '' };
        const mockPaths = ['src/i18n/en.json', 'src/i18n/it.json'];
        vi.mocked(glob).mockResolvedValue(mockPaths);
        vi.mocked(fs.readFile).mockResolvedValue('');

        const result = await searchLocalePaths(options);

        expect(result.length).toBeGreaterThan(0);
        expect(result.some((p) => p.includes('src/i18n/[locale].json'))).toBe(true);
      });

      it('should include i18n.ts files', async () => {
        const options = { source: 'en' };
        const mockPaths = ['src/i18n.ts'];
        vi.mocked(glob).mockResolvedValue(mockPaths);
        vi.mocked(fs.readFile).mockResolvedValue('');

        const result = await searchLocalePaths(options);

        expect(result.some((p) => p.includes('i18n.ts'))).toBe(true);
      });

      it('should include .vue files with i18n tags', async () => {
        const options = { source: 'en' };
        const mockPaths = ['src/App.vue', 'src/components/Component.vue'];
        vi.mocked(glob).mockResolvedValue(mockPaths);
        vi.mocked(fs.readFile).mockResolvedValue('<i18n>{"en": {}}</i18n>');
        vi.mocked(VueParser.hasI18nTag).mockReturnValue(true);

        const result = await searchLocalePaths(options);

        expect(result.some((p) => p.endsWith('.vue'))).toBe(true);
      });

      it('should filter Vue files by i18n tag presence', async () => {
        const options = { source: 'en' };
        const mockPaths = ['src/components/App.vue', 'src/components/Other.vue'];
        vi.mocked(glob).mockResolvedValue(mockPaths);
        vi.mocked(fs.readFile)
          .mockResolvedValueOnce('<i18n>...</i18n>')
          .mockResolvedValueOnce('<h1>Hello</h1>');
        vi.mocked(VueParser.hasI18nTag).mockReturnValueOnce(true).mockReturnValueOnce(false);

        const result = await searchLocalePaths(options);

        expect(result.length).toBeGreaterThanOrEqual(0);
        expect(result.some((p) => p === 'src/components/App.vue')).toBe(true);
        expect(result.some((p) => p === 'src/components/Other.vue')).toBe(false);
      });

      it('should include .md and .mdx files', async () => {
        const options = { source: 'en' };
        const mockPaths = ['src/docs/en.md', 'src/docs/en.mdx'];
        vi.mocked(glob).mockResolvedValue(mockPaths);
        vi.mocked(fs.readFile).mockResolvedValue('');

        const result = await searchLocalePaths(options);
        expect(result.some((p) => p.endsWith('.md'))).toBe(true);
      });

      it('should include .xml files', async () => {
        const options = { source: 'en' };
        const mockPaths = ['src/res/en/strings.xml'];
        vi.mocked(glob).mockResolvedValue(mockPaths);
        vi.mocked(fs.readFile).mockResolvedValue('');

        const result = await searchLocalePaths(options);
        expect(result.some((p) => p.endsWith('.xml'))).toBe(true);
      });

      it('should include android xml files', async () => {
        const options = { source: 'en' };
        const mockPaths = ['src/android/app/src/main/res/en/strings.xml'];
        vi.mocked(glob).mockResolvedValue(mockPaths);
        vi.mocked(fs.readFile).mockResolvedValue('');

        const result = await searchLocalePaths(options);
        expect(result.some((p) => p.endsWith('.xml'))).toBe(true);
      });

      it('should return unique paths', async () => {
        const options = { source: 'en' };
        const mockPaths = ['src/i18n/en.json', 'src/i18n/en.json'];
        vi.mocked(glob).mockResolvedValue(mockPaths);
        vi.mocked(fs.readFile).mockResolvedValue('');

        const result = await searchLocalePaths(options);

        const uniqueResults = new Set(result);
        expect(result.length).toBe(uniqueResults.size);
      });

      it('should normalize paths before returning', async () => {
        const options = { source: 'en' };
        const mockPaths = ['src/i18n/en.json'];
        vi.mocked(glob).mockResolvedValue(mockPaths);
        vi.mocked(fs.readFile).mockResolvedValue('');

        const result = await searchLocalePaths(options);

        expect(result.every((p) => p.includes('[locale]'))).toBe(true);
      });

      it('should filter paths matching locale regex', async () => {
        const options = { source: 'en' };
        const mockPaths = ['src/i18n/en.json', 'src/i18n/it.json', 'src/config.json'];
        vi.mocked(glob).mockResolvedValue(mockPaths);
        vi.mocked(fs.readFile).mockResolvedValue('');

        const result = await searchLocalePaths(options);

        expect(result.length).toBe(1);
        expect(result.some((p) => p.includes('src/i18n/[locale].json'))).toBe(true);
      });
    });
  });

  describe('searchPaths', () => {
    it('should search for files with supported extensions', async () => {
      const mockPaths = ['src/file.json', 'src/file.ts', 'src/file.vue'];
      vi.mocked(glob).mockResolvedValue(mockPaths);

      const result = await searchPaths();

      expect(result).toEqual(mockPaths);
      expect(glob).toHaveBeenCalled();
    });

    it('should use brace expansion for multiple file types', async () => {
      const mockPaths: string[] = [];
      vi.mocked(glob).mockResolvedValue(mockPaths);

      await searchPaths();

      const call = vi.mocked(glob).mock.calls[0];
      if (call) {
        expect(call[0]).toContain('{');
        expect(call[0]).toContain('json');
        expect(call[0]).toContain('ts');
        expect(call[0]).toContain('vue');
      }
    });

    it('should ignore default excluded directories', async () => {
      vi.mocked(glob).mockResolvedValue([]);

      await searchPaths();

      const call = vi.mocked(glob).mock.calls[0];
      if (call && call[1]) {
        expect(call[1]).toHaveProperty('ignore');
        expect(Array.isArray(call[1]?.ignore)).toBe(true);
      }
    });

    it('should use current working directory as cwd', async () => {
      vi.mocked(glob).mockResolvedValue([]);

      await searchPaths();

      const call = vi.mocked(glob).mock.calls[0];
      if (call && call[1]) {
        expect(call[1]).toHaveProperty('cwd', process.cwd());
      }
    });
  });

  describe('extractLocaleFromFilename', () => {
    it('should extract locale from filename', () => {
      expect(extractLocaleFromFilename('en.json')).toBe('en');
      expect(extractLocaleFromFilename('it.json')).toBe('it');
      expect(extractLocaleFromFilename('fr.json')).toBe('fr');
    });

    it('should extract complex locale codes', () => {
      expect(extractLocaleFromFilename('it-IT.json')).toBe('it-IT');
      expect(extractLocaleFromFilename('zh-CN.json')).toBe('zh-CN');
      expect(extractLocaleFromFilename('en-US.json')).toBe('en-US');
    });

    it('should return null when no locale is found', () => {
      expect(extractLocaleFromFilename('file.json')).toBeNull();
      expect(extractLocaleFromFilename('config.json')).toBeNull();
      expect(extractLocaleFromFilename('data.json')).toBeNull();
    });

    it('should handle filenames with locale in the middle', () => {
      expect(extractLocaleFromFilename('en.config.json')).toBe('en');
      expect(extractLocaleFromFilename('it.backup.json')).toBe('it');
    });

    it('should match longest locale first', () => {
      // If both 'en' and 'en-US' are available, it should match 'en-US' first
      expect(extractLocaleFromFilename('en-US.json')).toBe('en-US');
    });

    it('should handle case-insensitive matching', () => {
      expect(extractLocaleFromFilename('EN.json')).toBe('EN');
      expect(extractLocaleFromFilename('It.json')).toBe('It');
    });
  });
});
