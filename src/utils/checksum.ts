import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import yaml from 'yaml';
import { ParserFactory } from '../parsers/parser.factory.js';

type ChecksumChangelog = Record<
  string,
  {
    value: unknown;
    state: 'new' | 'updated' | 'unchanged';
  }
>;

type ChecksumFile = {
  version: string;
  // File hash -> key - hashed value mapping
  files: Record<string, Record<string, unknown>>;
};

const CHECKSUM_FILE = 'lara.lock';
const checksumFilePath = path.join(process.cwd(), CHECKSUM_FILE);

let cachedChecksumFile: ChecksumFile | null = null;

/**
 * Calculates the checksum of a file. And saves the checksum.
 *
 * @param fileName - The name of the file.
 * @param parser - Optional ParserFactory instance to reuse (preserves metadata like PO headers)
 * @param locale - Optional locale to filter keys (for multi-locale files like TS)
 * @returns The changelog of the file.
 */
function calculateChecksum(
  fileName: string,
  parser: ParserFactory,
  locale: string
): ChecksumChangelog {
  const checksumFile = getChecksumFile();
  const checksum = checksumFile.files[getHash(fileName)] || {};

  const changelog: ChecksumChangelog = {};

  const fileParser = parser || new ParserFactory(fileName);
  const fileContent = fileParser.parse(
    fs.readFileSync(fileName, 'utf8'),
    { targetLocale: locale }
  );

  let changed: boolean = false;

  for (const key in fileContent) {
    if (!checksum[key]) {
      changelog[key] = {
        value: fileContent[key],
        state: 'new',
      };
      changed = true;
      continue;
    }

    const newHash = getHash(fileContent[key]);
    const oldHash = checksum[key];

    if (newHash === oldHash) {
      changelog[key] = {
        value: fileContent[key],
        state: 'unchanged',
      };
      continue;
    }

    changelog[key] = {
      value: fileContent[key],
      state: 'updated',
    };
    changed = true;
    continue;
  }

  if (changed) {
    updateChecksum(fileName, fileContent);
  }

  return changelog;
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
      version: '1.0.0',
      files: {},
    };

    fs.writeFileSync(checksumFilePath, yaml.stringify(cachedChecksumFile));
    return cachedChecksumFile;
  }

  cachedChecksumFile = yaml.parse(fs.readFileSync(checksumFilePath, 'utf8')) as ChecksumFile;
  return cachedChecksumFile;
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

export { calculateChecksum };
