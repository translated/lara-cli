import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as yaml from 'yaml';
import * as crypto from 'crypto';
import { calculateChecksum, commitChecksum, resetChecksumCache } from '#utils/checksum.js';
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

      const { changelog, hasChanges } = calculateChecksum(
        mockFileName,
        mockParser as unknown as ParserFactory,
        ''
      );

      expect(changelog).toEqual({
        key1: { value: 'value1', state: 'new' },
        key2: { value: 'value2', state: 'new' },
      });
      expect(hasChanges).toBe(true);
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
        version: '1.1.0',
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

      const { changelog, hasChanges } = calculateChecksum(
        mockFileName,
        mockParser as unknown as ParserFactory,
        ''
      );

      expect(changelog).toEqual({
        key1: { value: 'value1', state: 'unchanged' },
        key2: { value: 'value2', state: 'unchanged' },
      });
      expect(hasChanges).toBe(false);
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
        version: '1.1.0',
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
      vi.mocked(yaml.stringify).mockReturnValue('version: 1.1.0\nfiles: {}');

      const { changelog, hasChanges } = calculateChecksum(
        mockFileName,
        mockParser as unknown as ParserFactory,
        ''
      );

      expect(changelog).toEqual({
        key1: { value: 'newvalue1', state: 'updated' },
        key2: { value: 'value2', state: 'unchanged' },
      });
      expect(hasChanges).toBe(true);
    });

    it('should not write to the lock file (read-only)', () => {
      // Regression test: premature lock writes caused stale targets to be
      // classified as "unchanged" on subsequent runs, skipping re-translation.
      const fileContent = { key1: 'newvalue' };
      const mockParser = { parse: vi.fn().mockReturnValue(fileContent) };

      const fileNameHash = getHash(mockFileName);
      const existingChecksum = {
        version: '1.1.0',
        files: {
          [fileNameHash]: { key1: getHash('oldvalue') },
        },
      };

      vi.mocked(ParserFactory).mockImplementation(() => mockParser as unknown as void);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('mock yaml content');
      vi.mocked(yaml.parse).mockReturnValue(existingChecksum);
      vi.mocked(yaml.stringify).mockReturnValue('mock yaml');

      calculateChecksum(mockFileName, mockParser as unknown as ParserFactory, '');

      // No write should happen on read — only commitChecksum persists.
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should create checksum file if it does not exist', () => {
      // getChecksumFile creates an empty lock when none exists. That write is
      // fine: it doesn't carry any stale source state.
      const uniqueFileName = 'test/new-file.json';
      const fileContent = {
        key1: 'value1',
      };

      const mockParser = {
        parse: vi.fn().mockReturnValue(fileContent),
      };

      vi.mocked(ParserFactory).mockImplementation(() => mockParser as unknown as void);
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.readFileSync).mockReturnValue('');
      vi.mocked(yaml.parse).mockReturnValue({ version: '1.1.0', files: {} });
      vi.mocked(yaml.stringify).mockReturnValue('version: 1.1.0\nfiles: {}');

      calculateChecksum(uniqueFileName, mockParser as unknown as ParserFactory, '');

      // Only the initial empty-lock creation should fire, with no per-file entry.
      const writeCalls = vi.mocked(fs.writeFileSync).mock.calls;
      expect(writeCalls.length).toBe(1);
      expect(writeCalls[0]![1] as string).not.toContain(uniqueFileName);
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
      vi.mocked(yaml.parse).mockReturnValue({ version: '1.1.0', files: {} });
      vi.mocked(yaml.stringify).mockReturnValue('version: 1.1.0\nfiles: {}');

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
      vi.mocked(yaml.parse).mockReturnValue({ version: '1.1.0', files: {} });
      vi.mocked(yaml.stringify).mockReturnValue('version: 1.1.0\nfiles: {}');

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
      vi.mocked(yaml.parse).mockReturnValue({ version: '1.1.0', files: {} });
      vi.mocked(yaml.stringify).mockReturnValue('version: 1.1.0\nfiles: {}');

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
      vi.mocked(yaml.parse).mockReturnValue({ version: '1.1.0', files: {} });
      vi.mocked(yaml.stringify).mockReturnValue('version: 1.1.0\nfiles: {}');

      const { changelog, hasChanges } = calculateChecksum(
        mockFileName,
        mockParser as unknown as ParserFactory,
        ''
      );

      expect(changelog).toEqual({});
      expect(hasChanges).toBe(false);
    });

    it('should handle file with no existing checksum entry', () => {
      const uniqueFileName = 'test/no-entry-file.json';
      const fileContent = {
        key1: 'value1',
      };

      const mockParser = {
        parse: vi.fn().mockReturnValue(fileContent),
      };

      const differentFileName = 'test/other-file.json';
      const differentFileHash = getHash(differentFileName);
      const existingChecksum = {
        version: '1.1.0',
        files: {
          [differentFileHash]: {
            otherkey: getHash('othervalue'),
          },
        },
      };

      vi.mocked(ParserFactory).mockImplementation(() => mockParser as unknown as void);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('mock yaml content');
      vi.mocked(yaml.parse).mockReturnValue(existingChecksum);
      vi.mocked(yaml.stringify).mockReturnValue('version: 1.1.0\nfiles: {}');

      const { changelog, hasChanges } = calculateChecksum(
        uniqueFileName,
        mockParser as unknown as ParserFactory,
        ''
      );

      expect(changelog).toEqual({
        key1: { value: 'value1', state: 'new' },
      });
      expect(hasChanges).toBe(true);
    });

    it('should detect deleted keys with state deleted', () => {
      const uniqueFileName = 'test/deleted-keys.json';
      const fileContent = {
        key1: 'value1',
        key2: 'value2',
      };

      const mockParser = {
        parse: vi.fn().mockReturnValue(fileContent),
      };

      const fileNameHash = getHash(uniqueFileName);
      const existingChecksum = {
        version: '1.1.0',
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
      vi.mocked(yaml.stringify).mockReturnValue('version: 1.1.0\nfiles: {}');

      const { changelog, hasChanges } = calculateChecksum(
        uniqueFileName,
        mockParser as unknown as ParserFactory,
        ''
      );

      expect(changelog).toEqual({
        key1: { value: 'value1', state: 'unchanged' },
        key2: { value: 'value2', state: 'unchanged' },
        key3: { value: null, state: 'deleted' },
      });
      expect(hasChanges).toBe(true);
    });

    it('should handle object values correctly when hashing', () => {
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
      vi.mocked(yaml.parse).mockReturnValue({ version: '1.1.0', files: {} });
      vi.mocked(yaml.stringify).mockReturnValue('version: 1.1.0\nfiles: {}');

      const { changelog } = calculateChecksum(
        uniqueFileName,
        mockParser as unknown as ParserFactory,
        ''
      );

      expect(changelog.key1).toBeDefined();
      const key1 = changelog.key1!;
      expect(key1.value).toEqual({ nested: 'value' });
      expect(key1.state).toBe('new');
      expect(changelog.key2).toBeDefined();
      const key2 = changelog.key2!;
      expect(key2.value).toEqual(['array', 'values']);
      expect(key2.state).toBe('new');
    });
  });

  describe('commitChecksum', () => {
    it('should persist hashes of current source values', () => {
      const uniqueFileName = 'test/commit.json';
      const fileNameHash = getHash(uniqueFileName);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('mock yaml');
      vi.mocked(yaml.parse).mockReturnValue({ version: '1.1.0', files: {} });
      vi.mocked(yaml.stringify).mockImplementation((obj) => JSON.stringify(obj));

      commitChecksum(uniqueFileName, {
        key1: { value: 'new value', state: 'updated' },
        key2: { value: 'fresh', state: 'new' },
        key3: { value: 'kept', state: 'unchanged' },
      });

      const writeCalls = vi.mocked(fs.writeFileSync).mock.calls;
      expect(writeCalls.length).toBe(1);
      const payload = JSON.parse(writeCalls[0]![1] as string) as {
        files: Record<string, Record<string, string>>;
      };
      expect(payload.files[fileNameHash]).toEqual({
        key1: getHash('new value'),
        key2: getHash('fresh'),
        key3: getHash('kept'),
      });
    });

    it('should exclude deleted keys from persisted hashes', () => {
      const uniqueFileName = 'test/commit-deleted.json';
      const fileNameHash = getHash(uniqueFileName);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('mock yaml');
      vi.mocked(yaml.parse).mockReturnValue({ version: '1.1.0', files: {} });
      vi.mocked(yaml.stringify).mockImplementation((obj) => JSON.stringify(obj));

      commitChecksum(uniqueFileName, {
        kept: { value: 'hello', state: 'unchanged' },
        gone: { value: null, state: 'deleted' },
      });

      const writeCalls = vi.mocked(fs.writeFileSync).mock.calls;
      expect(writeCalls.length).toBe(1);
      const payload = JSON.parse(writeCalls[0]![1] as string) as {
        files: Record<string, Record<string, string>>;
      };
      expect(payload.files[fileNameHash]).toEqual({
        kept: getHash('hello'),
      });
    });
  });

  describe('stale target regression', () => {
    // Reproduces the original bug report: if a prior run wrote hashes to the
    // lock but the target file never got the matching translation, the source
    // now looks "unchanged" even though the target is stale. With the
    // read-only calculateChecksum, the lock is only ever written after targets
    // are successfully produced — so this scenario can no longer be reached
    // through normal use. This test documents the contract.
    it('calculateChecksum never writes, even when source differs from lock', () => {
      const uniqueFileName = 'test/stale-regression.json';
      const fileNameHash = getHash(uniqueFileName);
      const mockParser = {
        parse: vi.fn().mockReturnValue({
          'faq\u0000items\u00000\u0000title': 'new question',
        }),
      };

      const existingChecksum = {
        version: '1.1.0',
        files: {
          [fileNameHash]: {
            'faq\u0000items\u00000\u0000title': getHash('old question'),
          },
        },
      };

      vi.mocked(ParserFactory).mockImplementation(() => mockParser as unknown as void);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('mock yaml');
      vi.mocked(yaml.parse).mockReturnValue(existingChecksum);
      vi.mocked(yaml.stringify).mockImplementation((obj) => JSON.stringify(obj));

      const { changelog, hasChanges } = calculateChecksum(
        uniqueFileName,
        mockParser as unknown as ParserFactory,
        ''
      );

      expect(changelog['faq\u0000items\u00000\u0000title']).toEqual({
        value: 'new question',
        state: 'updated',
      });
      expect(hasChanges).toBe(true);
      // Crucially, no lock write yet — that's the caller's job via commitChecksum.
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('lock file migration (slash → null byte)', () => {
    it('should migrate / keys to \\0 and find them on lookup', () => {
      const uniqueFileName = 'test/migrate-slash.json';
      const fileNameHash = getHash(uniqueFileName);

      // Source parses to new-format keys (flat library with \0 delimiter)
      const fileContent = {
        'faq\u0000items\u00000\u0000title': 'Q1',
        'meta\0title': 'Title',
      };

      const mockParser = {
        parse: vi.fn().mockReturnValue(fileContent),
      };

      // Lock is in old v1.0.0 format with / separator
      const existingChecksum = {
        version: '1.0.0',
        files: {
          [fileNameHash]: {
            'faq/items/0/title': getHash('Q1'),
            'meta/title': getHash('Title'),
          },
        },
      };

      vi.mocked(ParserFactory).mockImplementation(() => mockParser as unknown as void);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('mock yaml content');
      vi.mocked(yaml.parse).mockReturnValue(existingChecksum);
      vi.mocked(yaml.stringify).mockImplementation((obj) => JSON.stringify(obj));

      const { changelog } = calculateChecksum(
        uniqueFileName,
        mockParser as unknown as ParserFactory,
        ''
      );

      // After migration, lookups hit → both keys unchanged
      expect(changelog).toEqual({
        'faq\u0000items\u00000\u0000title': { value: 'Q1', state: 'unchanged' },
        'meta\0title': { value: 'Title', state: 'unchanged' },
      });

      // Migration should have written the lock back with v1.1.0 and \0 keys
      const stringifyCalls = vi.mocked(yaml.stringify).mock.calls;
      const migrationPayload = stringifyCalls.find((call) => {
        const arg = call[0] as {
          version?: string;
          files?: Record<string, Record<string, unknown>>;
        };
        return arg.version === '1.1.0';
      });
      expect(migrationPayload).toBeDefined();
      const payload = migrationPayload![0] as {
        version: string;
        files: Record<string, Record<string, unknown>>;
      };
      expect(payload.files[fileNameHash]).toEqual({
        'faq\u0000items\u00000\u0000title': getHash('Q1'),
        'meta\0title': getHash('Title'),
      });
    });

    it('should only migrate entries in old format, leaving \\0 entries alone', () => {
      const oldFileName = 'test/old.json';
      const newFileName = 'test/new.json';
      const oldHash = getHash(oldFileName);
      const newHash = getHash(newFileName);

      const mockParser = {
        parse: vi.fn().mockReturnValue({ 'a\0b': 'v' }),
      };

      const existingChecksum = {
        version: '1.0.0',
        files: {
          [oldHash]: { 'a/b': getHash('v') },
          [newHash]: { 'a\0b': getHash('v') },
        },
      };

      vi.mocked(ParserFactory).mockImplementation(() => mockParser as unknown as void);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('mock yaml content');
      vi.mocked(yaml.parse).mockReturnValue(existingChecksum);
      vi.mocked(yaml.stringify).mockImplementation((obj) => JSON.stringify(obj));

      calculateChecksum(oldFileName, mockParser as unknown as ParserFactory, '');

      const migrationCall = vi
        .mocked(yaml.stringify)
        .mock.calls.find((call) => (call[0] as { version?: string }).version === '1.1.0');
      expect(migrationCall).toBeDefined();
      const payload = migrationCall![0] as {
        files: Record<string, Record<string, unknown>>;
      };

      expect(payload.files[oldHash]).toEqual({ 'a\0b': getHash('v') });
      expect(payload.files[newHash]).toEqual({ 'a\0b': getHash('v') });
    });

    it('should not write lock on load when no entries need migration', () => {
      const uniqueFileName = 'test/flat-keys.json';
      const fileNameHash = getHash(uniqueFileName);

      const mockParser = {
        parse: vi.fn().mockReturnValue({ login: 'Log in', sign_up: 'Sign up' }),
      };

      const existingChecksum = {
        version: '1.0.0',
        files: {
          [fileNameHash]: {
            login: getHash('Log in'),
            sign_up: getHash('Sign up'),
          },
        },
      };

      vi.mocked(ParserFactory).mockImplementation(() => mockParser as unknown as void);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('mock yaml content');
      vi.mocked(yaml.parse).mockReturnValue(existingChecksum);
      vi.mocked(yaml.stringify).mockReturnValue('mock yaml output');

      calculateChecksum(uniqueFileName, mockParser as unknown as ParserFactory, '');

      // No writes at all: flat-keys entry doesn't need migration and all values unchanged
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should be idempotent on already-migrated (v1.1.0) lock', () => {
      const uniqueFileName = 'test/already-migrated.json';
      const fileNameHash = getHash(uniqueFileName);

      const mockParser = {
        parse: vi.fn().mockReturnValue({ 'a\0b': 'v' }),
      };

      const existingChecksum = {
        version: '1.1.0',
        files: {
          [fileNameHash]: { 'a\0b': getHash('v') },
        },
      };

      vi.mocked(ParserFactory).mockImplementation(() => mockParser as unknown as void);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('mock yaml content');
      vi.mocked(yaml.parse).mockReturnValue(existingChecksum);
      vi.mocked(yaml.stringify).mockReturnValue('mock yaml output');

      calculateChecksum(uniqueFileName, mockParser as unknown as ParserFactory, '');

      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should not touch new-format keys that literally contain /', () => {
      const uniqueFileName = 'test/literal-slash.json';
      const fileNameHash = getHash(uniqueFileName);

      const mockParser = {
        parse: vi.fn().mockReturnValue({
          'harassment/threatening': 'Message',
          'category\0sub': 'Value',
        }),
      };

      const existingChecksum = {
        version: '1.1.0',
        files: {
          [fileNameHash]: {
            'harassment/threatening': getHash('Message'),
            'category\0sub': getHash('Value'),
          },
        },
      };

      vi.mocked(ParserFactory).mockImplementation(() => mockParser as unknown as void);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('mock yaml content');
      vi.mocked(yaml.parse).mockReturnValue(existingChecksum);
      vi.mocked(yaml.stringify).mockReturnValue('mock yaml output');

      const { changelog } = calculateChecksum(
        uniqueFileName,
        mockParser as unknown as ParserFactory,
        ''
      );

      expect(changelog).toEqual({
        'harassment/threatening': { value: 'Message', state: 'unchanged' },
        'category\0sub': { value: 'Value', state: 'unchanged' },
      });
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });
});
