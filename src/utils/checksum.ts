import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import yaml from 'yaml';
import { ParserFactory } from '../parsers/parser.factory.js';

enum ChecksumState {
  NEW = 'new',
  UPDATED = 'updated',
  UNCHANGED = 'unchanged',
  DELETED = 'deleted',
}

type ChecksumChangelog = Record<
  string,
  {
    value: unknown;
    state: 'new' | 'updated' | 'unchanged' | 'deleted';
  }
>;

type ChecksumResult = {
  changelog: ChecksumChangelog;
  hasChanges: boolean;
};

type ChecksumFile = {
  version: string;
  // File hash -> key - hashed value mapping
  files: Record<string, Record<string, unknown>>;
};

const CHECKSUM_FILE = 'lara.lock';
const LOCK_FILE_VERSION = '1.1.0';
const checksumFilePath = path.join(process.cwd(), CHECKSUM_FILE);

let cachedChecksumFile: ChecksumFile | null = null;

/**
 * Computes the changelog for a source file by diffing it against the lock.
 *
 * IMPORTANT: This function does NOT persist anything to the lock file. The lock
 * must only be updated AFTER translation has successfully written target files,
 * otherwise a partial/failed run would leave the lock in sync with the source
 * while targets remain stale — causing subsequent runs to skip keys as
 * "unchanged" even though their translations were never produced. Call
 * `commitChecksum` once all targets have been written.
 *
 * @param fileName - The name of the file.
 * @param parser - Optional ParserFactory instance to reuse (preserves metadata like PO headers)
 * @param locale - Optional locale to filter keys (for multi-locale files like TS)
 * @returns The changelog and a flag indicating whether anything changed.
 */
function calculateChecksum(
  fileName: string,
  parser: ParserFactory,
  locale: string
): ChecksumResult {
  const checksumFile = getChecksumFile();
  const checksum = checksumFile.files[getHash(fileName)] || {};

  const changelog: ChecksumChangelog = {};

  const fileParser = parser || new ParserFactory(fileName);
  const fileContent = fileParser.parse(fs.readFileSync(fileName, 'utf8'), { targetLocale: locale });

  let changed: boolean = false;

  for (const key in fileContent) {
    if (!checksum[key]) {
      changelog[key] = {
        value: fileContent[key],
        state: ChecksumState.NEW,
      };
      changed = true;
      continue;
    }

    const newHash = getHash(fileContent[key]);
    const oldHash = checksum[key];

    if (newHash === oldHash) {
      changelog[key] = {
        value: fileContent[key],
        state: ChecksumState.UNCHANGED,
      };
      continue;
    }

    changelog[key] = {
      value: fileContent[key],
      state: ChecksumState.UPDATED,
    };
    changed = true;
    continue;
  }

  // Detect deleted keys: keys present in checksum but no longer in file
  for (const key in checksum) {
    if (!(key in fileContent)) {
      changelog[key] = { value: null, state: ChecksumState.DELETED };
      changed = true;
    }
  }

  return { changelog, hasChanges: changed };
}

/**
 * Persists the source hashes derived from a changelog to the lock file. Call
 * this after all target locales have been successfully translated and written.
 * Deleted keys are excluded from the stored hashes.
 */
function commitChecksum(fileName: string, changelog: ChecksumChangelog) {
  const values: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(changelog)) {
    if (entry.state === ChecksumState.DELETED) continue;
    values[key] = entry.value;
  }
  updateChecksum(fileName, values);
}

/**
 * Saves the checksum of a file.
 *
 * @param fileName - The name of the file.
 * @param values - The values to save.
 */
function updateChecksum(fileName: string, values: Record<string, unknown>) {
  const checksumFile = getChecksumFile();
  const fileNameHash = getHash(fileName);

  const hashedValues = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, getHash(value)])
  );

  checksumFile.files[fileNameHash] = hashedValues;

  cachedChecksumFile = checksumFile;
  fs.writeFileSync(checksumFilePath, yaml.stringify(checksumFile));
}

/**
 * Returns the checksum lock of a file.
 *
 * @param fileName - The name of the file.
 * @returns The checksum lock of the file.
 */
function getChecksumFile(): ChecksumFile {
  if (cachedChecksumFile) {
    return cachedChecksumFile;
  }

  if (!fs.existsSync(checksumFilePath)) {
    cachedChecksumFile = {
      version: LOCK_FILE_VERSION,
      files: {},
    };

    fs.writeFileSync(checksumFilePath, yaml.stringify(cachedChecksumFile));
    return cachedChecksumFile;
  }

  const parsed = yaml.parse(fs.readFileSync(checksumFilePath, 'utf8')) as ChecksumFile;
  cachedChecksumFile = migrateChecksumFile(parsed);
  return cachedChecksumFile;
}

// Safe because the old format could not correctly represent keys containing a
// literal `/` — so every `/` in an old-format entry is always a separator.
function migrateChecksumFile(file: ChecksumFile): ChecksumFile {
  if (file.version === LOCK_FILE_VERSION) {
    return file;
  }

  let migrated = false;
  const migratedFiles: ChecksumFile['files'] = {};

  for (const [fileHash, entry] of Object.entries(file.files || {})) {
    const keys = Object.keys(entry);
    const hasNullByte = keys.some((k) => k.includes('\0'));
    const hasSlash = keys.some((k) => k.includes('/'));

    if (!hasNullByte && hasSlash) {
      migratedFiles[fileHash] = Object.fromEntries(
        Object.entries(entry).map(([key, value]) => [key.replaceAll('/', '\0'), value])
      );
      migrated = true;
    } else {
      migratedFiles[fileHash] = entry;
    }
  }

  const result: ChecksumFile = {
    version: LOCK_FILE_VERSION,
    files: migratedFiles,
  };

  if (migrated) {
    fs.writeFileSync(checksumFilePath, yaml.stringify(result));
  }

  return result;
}

/**
 * Returns the MD5 hash of a string or an object.
 *
 * @param s - The string or object to hash.
 * @returns The MD5 hash of the string or object.
 */
function getHash(s: unknown) {
  const data: string = typeof s === 'string' ? s : JSON.stringify(s);
  return crypto.createHash('md5').update(data).digest('hex');
}

function resetChecksumCache() {
  cachedChecksumFile = null;
}

export { calculateChecksum, commitChecksum, resetChecksumCache, ChecksumState };
