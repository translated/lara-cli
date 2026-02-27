import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as yaml from 'yaml';
import * as crypto from 'crypto';
import { calculateChecksum, resetChecksumCache } from '#utils/checksum.js';
import { ParserFactory } from '../../parsers/parser.factory.js';

// Helper function to calculate hash
function getHash(s: unknown): string {
  const data: string = typeof s === 'string' ? s : JSON.stringify(s);
  return crypto.createHash('md5').update(data).digest('hex');
}

// Mock dependencies
vi.mock('fs');
vi.mock('yaml');
vi.mock('../../parsers/parser.factory.js');
vi.mock('path', () => ({
  default: {
    join: vi.fn((...args: string[]) => args.join('/')),
  },
}));

describe('checksum utils', () => {
  const mockFileName = 'test/locales/en.json';

  beforeEach(() => {
    vi.clearAllMocks();
    resetChecksumCache();
    vi.spyOn(process, 'cwd').mockReturnValue('/mock/path');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateChecksum', () => {
    it('should return new state for all keys when checksum file does not exist', () => {
      const fileContent = {
        key1: 'value1',
        key2: 'value2',
      };

      const mockParser = {
        parse: vi.fn().mockReturnValue(fileContent),
      };

      vi.mocked(ParserFactory).mockImplementation(() => mockParser as unknown as void);
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.readFileSync).mockReturnValue('');
      vi.mocked(yaml.parse).mockReturnValue({ version: '1.0.0', files: {} });
      vi.mocked(yaml.stringify).mockReturnValue('version: 1.0.0\nfiles: {}');

      const result = calculateChecksum(mockFileName, mockParser as unknown as ParserFactory, '');

      expect(result).toEqual({
        key1: { value: 'value1', state: 'new' },
        key2: { value: 'value2', state: 'new' },
      });
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should return unchanged state when checksums match', () => {
      const fileContent = {
        key1: 'value1',
        key2: 'value2',
      };

      const mockParser = {
        parse: vi.fn().mockReturnValue(fileContent),
      };

      // Calculate actual hashes for the file name and values
      const fileNameHash = getHash(mockFileName);
      const value1Hash = getHash('value1');
      const value2Hash = getHash('value2');

      const existingChecksum = {
        version: '1.0.0',
        files: {
          [fileNameHash]: {
            key1: value1Hash,
            key2: value2Hash,
          },
        },
      };

      vi.mocked(ParserFactory).mockImplementation(() => mockParser as unknown as void);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('mock yaml content');
      vi.mocked(yaml.parse).mockReturnValue(existingChecksum);

      const result = calculateChecksum(mockFileName, mockParser as unknown as ParserFactory, '');

      expect(result).toEqual({
        key1: { value: 'value1', state: 'unchanged' },
        key2: { value: 'value2', state: 'unchanged' },
      });
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should return updated state when checksums do not match', () => {
      const fileContent = {
        key1: 'newvalue1',
        key2: 'value2',
      };

      const mockParser = {
        parse: vi.fn().mockReturnValue(fileContent),
      };

      // Calculate actual hashes
      const fileNameHash = getHash(mockFileName);
      const oldValue1Hash = getHash('oldvalue1'); // Old value that was in checksum
      const value2Hash = getHash('value2');

      const existingChecksum = {
        version: '1.0.0',
        files: {
          [fileNameHash]: {
            key1: oldValue1Hash, // Old hash that won't match newvalue1
            key2: value2Hash, // This will match
          },
        },
      };

      vi.mocked(ParserFactory).mockImplementation(() => mockParser as unknown as void);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('mock yaml content');
      vi.mocked(yaml.parse).mockReturnValue(existingChecksum);
      vi.mocked(yaml.stringify).mockReturnValue('version: 1.0.0\nfiles: {}');

      const result = calculateChecksum(mockFileName, mockParser as unknown as ParserFactory, '');

      expect(result).toEqual({
        key1: { value: 'newvalue1', state: 'updated' },
        key2: { value: 'value2', state: 'unchanged' },
      });
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should create checksum file if it does not exist', () => {
      // Use a unique file name to avoid cache conflicts
      const uniqueFileName = 'test/new-file.json';
      const fileContent = {
        key1: 'value1',
      };

      const mockParser = {
        parse: vi.fn().mockReturnValue(fileContent),
      };

      vi.mocked(ParserFactory).mockImplementation(() => mockParser as unknown as void);
      // File doesn't exist - this will trigger file creation
      // Note: if cachedChecksumFile is already set, existsSync won't be called in getChecksumFile
      // but updateChecksum will still call writeFileSync
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.readFileSync).mockReturnValue('');
      vi.mocked(yaml.parse).mockReturnValue({ version: '1.0.0', files: {} });
      vi.mocked(yaml.stringify).mockReturnValue('version: 1.0.0\nfiles: {}');

      calculateChecksum(uniqueFileName, mockParser as unknown as ParserFactory, '');

      // Verify that writeFileSync was called (for updating checksums when changed is true)
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should use provided parser instance instead of creating new one', () => {
      const fileContent = {
        key1: 'value1',
      };

      const mockParser = {
        parse: vi.fn().mockReturnValue(fileContent),
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.readFileSync).mockReturnValue('');
      vi.mocked(yaml.parse).mockReturnValue({ version: '1.0.0', files: {} });
      vi.mocked(yaml.stringify).mockReturnValue('version: 1.0.0\nfiles: {}');

      calculateChecksum(mockFileName, mockParser as unknown as ParserFactory, '');

      expect(ParserFactory).not.toHaveBeenCalled();
      expect(mockParser.parse).toHaveBeenCalledWith(expect.any(String), { targetLocale: '' });
    });

    it('should create new parser if none provided', () => {
      const fileContent = {
        key1: 'value1',
      };

      const mockParser = {
        parse: vi.fn().mockReturnValue(fileContent),
      };

      vi.mocked(ParserFactory).mockImplementation(function () {
        return mockParser as unknown;
      } as unknown as () => void);
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.readFileSync).mockReturnValue('file content');
      vi.mocked(yaml.parse).mockReturnValue({ version: '1.0.0', files: {} });
      vi.mocked(yaml.stringify).mockReturnValue('version: 1.0.0\nfiles: {}');

      calculateChecksum(mockFileName, null as unknown as ParserFactory, '');

      expect(ParserFactory).toHaveBeenCalledWith(mockFileName);
      expect(mockParser.parse).toHaveBeenCalledWith('file content', { targetLocale: '' });
    });

    it('should pass locale option to parser', () => {
      const fileContent = {
        key1: 'value1',
      };

      const mockParser = {
        parse: vi.fn().mockReturnValue(fileContent),
      };

      vi.mocked(ParserFactory).mockImplementation(() => mockParser as unknown as void);
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.readFileSync).mockReturnValue('file content');
      vi.mocked(yaml.parse).mockReturnValue({ version: '1.0.0', files: {} });
      vi.mocked(yaml.stringify).mockReturnValue('version: 1.0.0\nfiles: {}');

      calculateChecksum(mockFileName, mockParser as unknown as ParserFactory, 'en');

      expect(mockParser.parse).toHaveBeenCalledWith('file content', { targetLocale: 'en' });
    });

    it('should handle empty file content', () => {
      const fileContent = {};

      const mockParser = {
        parse: vi.fn().mockReturnValue(fileContent),
      };

      vi.mocked(ParserFactory).mockImplementation(() => mockParser as unknown as void);
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.readFileSync).mockReturnValue('');
      vi.mocked(yaml.parse).mockReturnValue({ version: '1.0.0', files: {} });
      vi.mocked(yaml.stringify).mockReturnValue('version: 1.0.0\nfiles: {}');

      const result = calculateChecksum(mockFileName, mockParser as unknown as ParserFactory, '');

      expect(result).toEqual({});
      // writeFileSync may be called once for initial checksum file creation,
      // but updateChecksum should not be called (no changes detected)
      const writeCalls = vi.mocked(fs.writeFileSync).mock.calls;
      // If called, it should only be the initial file creation, not an update
      for (const call of writeCalls) {
        const content = call[1] as string;
        // The initial creation writes an empty files object
        expect(content).not.toContain(mockFileName);
      }
    });

    it('should handle file with no existing checksum entry', () => {
      // Use a unique file name to avoid cache conflicts
      const uniqueFileName = 'test/no-entry-file.json';
      const fileContent = {
        key1: 'value1',
      };

      const mockParser = {
        parse: vi.fn().mockReturnValue(fileContent),
      };

      // Use a different file name so this file's entry doesn't exist
      const differentFileName = 'test/other-file.json';
      const differentFileHash = getHash(differentFileName);
      const existingChecksum = {
        version: '1.0.0',
        files: {
          // No entry for uniqueFileName
          [differentFileHash]: {
            otherkey: getHash('othervalue'),
          },
        },
      };

      vi.mocked(ParserFactory).mockImplementation(() => mockParser as unknown as void);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('mock yaml content');
      vi.mocked(yaml.parse).mockReturnValue(existingChecksum);
      vi.mocked(yaml.stringify).mockReturnValue('version: 1.0.0\nfiles: {}');

      const result = calculateChecksum(uniqueFileName, mockParser as unknown as ParserFactory, '');

      expect(result).toEqual({
        key1: { value: 'value1', state: 'new' },
      });
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should detect deleted keys with state deleted', () => {
      // Use a unique file name to avoid cache conflicts
      const uniqueFileName = 'test/deleted-keys.json';
      // File now only has key1 and key2, but checksum has key1, key2, key3
      const fileContent = {
        key1: 'value1',
        key2: 'value2',
      };

      const mockParser = {
        parse: vi.fn().mockReturnValue(fileContent),
      };

      const fileNameHash = getHash(uniqueFileName);
      const existingChecksum = {
        version: '1.0.0',
        files: {
          [fileNameHash]: {
            key1: getHash('value1'),
            key2: getHash('value2'),
            key3: getHash('value3'),
          },
        },
      };

      vi.mocked(ParserFactory).mockImplementation(() => mockParser as unknown as void);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('mock yaml content');
      vi.mocked(yaml.parse).mockReturnValue(existingChecksum);
      vi.mocked(yaml.stringify).mockReturnValue('version: 1.0.0\nfiles: {}');

      const result = calculateChecksum(uniqueFileName, mockParser as unknown as ParserFactory, '');

      expect(result).toEqual({
        key1: { value: 'value1', state: 'unchanged' },
        key2: { value: 'value2', state: 'unchanged' },
        key3: { value: null, state: 'deleted' },
      });
      // changed should be true because of the deleted key
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should handle object values correctly when hashing', () => {
      // Use a unique file name to avoid cache conflicts
      const uniqueFileName = 'test/object-values.json';
      const fileContent = {
        key1: { nested: 'value' },
        key2: ['array', 'values'],
      };

      const mockParser = {
        parse: vi.fn().mockReturnValue(fileContent),
      };

      vi.mocked(ParserFactory).mockImplementation(() => mockParser as unknown as void);
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.readFileSync).mockReturnValue('');
      vi.mocked(yaml.parse).mockReturnValue({ version: '1.0.0', files: {} });
      vi.mocked(yaml.stringify).mockReturnValue('version: 1.0.0\nfiles: {}');

      const result = calculateChecksum(uniqueFileName, mockParser as unknown as ParserFactory, '');

      // Verify that object values are handled correctly
      expect(result.key1).toBeDefined();
      const key1 = result.key1!;
      expect(key1.value).toEqual({ nested: 'value' });
      expect(key1.state).toBe('new');
      expect(result.key2).toBeDefined();
      const key2 = result.key2!;
      expect(key2.value).toEqual(['array', 'values']);
      expect(key2.state).toBe('new');
    });
  });
});
