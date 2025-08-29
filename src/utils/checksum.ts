import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import yaml from 'yaml';

import { parseFlattened } from './json.js';

type ChecksumChangelog = Record<string, {
  value: unknown;
  state: 'new' | 'updated' | 'unchanged';
}>;

type ChecksumLock = {
  // The version of the checksum lock.
  version: string;
  // The keys of the file as key -> value hash.
  keys: Record<string, string>;
};

const CHECKSUM_FOLDER = '.lara';

/**
 * Calculates the checksum of a file.
 * 
 * @param fileName - The name of the file.
 * @param fileContent - The content of the file.
 * @returns The changelog of the file.
 */
function calculateChecksum(fileName: string): ChecksumChangelog {
  const fileChecksum = getFileChecksum(fileName);
  const changelog: ChecksumChangelog = {};

  const fileContent = parseFlattened(fs.readFileSync(fileName, 'utf8'));

  let changed: boolean = false;

  for(const key in fileContent) {
    if(!fileChecksum.keys[key]) {
      changelog[key] = {
        value: fileContent[key],
        state: 'new'
      };
      changed = true;
      continue;
    }

    const newHash = getHash(fileContent[key]);
    const oldHash = fileChecksum.keys[key];

    if(newHash === oldHash) {
      changelog[key] = {
        value: fileContent[key],
        state: 'unchanged'
      };
      continue;
    }

    changelog[key] = {
      value: fileContent[key],
      state: 'updated'
    };
    changed = true;
    continue;
  }

  if(changed) {
    saveChecksum(fileName, fileContent);
  }

  return changelog;
}

/**
 * Saves the checksum of a file.
 * 
 * @param fileName - The name of the file.
 * @param values - The values to save.
 */
function saveChecksum(fileName: string, values: Record<string, unknown>) {
  const checksumDirectory = getChecksumDirectory();
  const hash = getHash(fileName);
  const checksumFile = path.join(checksumDirectory, `${hash}.lock`);

  const keys = Object.fromEntries(
    Object.entries(values)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, getHash(value)])
  )

  const checksumLock: ChecksumLock = {
    version: '1.0.0',
    keys
  };
  
  fs.writeFileSync(checksumFile, yaml.stringify(checksumLock));
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

/**
 * Returns the checksum lock of a file.
 * 
 * @param fileName - The name of the file.
 * @returns The checksum lock of the file.
 */
function getFileChecksum(fileName: string): ChecksumLock {
  const checksumDirectory = getChecksumDirectory();
  const fileNameHash = getHash(fileName);

  const checksumFile = path.join(checksumDirectory, `${fileNameHash}.lock`);

  if(!fs.existsSync(checksumFile)) {
    const checkSum = {
      version: '1.0.0',
      keys: {}
    };

    fs.writeFileSync(checksumFile, yaml.stringify(checkSum));

    return checkSum;
  }

  return yaml.parse(fs.readFileSync(checksumFile, 'utf8')) as ChecksumLock;
}

/**
 * Returns the checksum directory. Creates the directory if it doesn't exist.
 * 
 * @returns The checksum directory.
 */
function getChecksumDirectory() {
  const checksumDirectory = path.join(process.cwd(), CHECKSUM_FOLDER);
  if(!fs.existsSync(checksumDirectory)) {
    fs.mkdirSync(checksumDirectory);
  }

  return checksumDirectory;
}

export {
  calculateChecksum,
  saveChecksum
};
