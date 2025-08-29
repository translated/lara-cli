import * as fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

import {
  AVAILABLE_LOCALES,
  DEFAULT_EXCLUDED_DIRECTORIES,
  SUPPORTED_FILE_TYPES,
} from '#modules/common/common.const.js';


const availableLocales: Set<string> = new Set(AVAILABLE_LOCALES);

/**
 * Checks if the path is relative
 * 
 * @param path - The path to check.
 * @returns True if the path is relative, false otherwise.
 */
function isRelative(path: string): boolean {
  return !path.startsWith('/') && !path.startsWith('./') && !path.startsWith('../');
}

/**
 * Gets the file extension from the path
 * 
 * @param path - The path to get the file extension from.
 * @returns The file extension.
 */
function getFileExtension(path: string): string {
  return path.split('.').pop() ?? '';
}

/**
 * Reads a file safely, returning a fallback value if the file does not exist
 * 
 * @param filePath - The path to the file.
 * @param fallback - The fallback value to return if the file does not exist.
 * @returns The file content.
 */
async function readSafe(filePath: string, fallback: string = ''): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return fallback;
  }
}

/**
   * Ensures that the directory for the given file path exists
   * @param filePath - The full path to the file
   */
async function ensureDirectoryExists(filePath: string): Promise<void> {
  const directory = path.dirname(filePath);
  try {
    await fs.access(directory);
  } catch {
    // Directory doesn't exist, create it recursively
    await fs.mkdir(directory, { recursive: true });
  }
}

/**
   * Builds a path by replacing the [locale] placeholder with the given locale
   *
   * @param path - The path to build. Example: 'src/i18n/[locale].json'
   * @param locale - The locale to replace the placeholder with. Example: 'en-US'
   * @returns The built path. Example: 'src/i18n/en-US.json'
   */
function buildLocalePath(filePath: string, locale: string): string {
  return filePath.replaceAll('[locale]', locale);
}

/**
 * Searches for paths by a pattern
 * 
 * @param pattern - The pattern to search for. Example: 'src/i18n/[locale].json'
 * @returns A promise that resolves to an array of paths.
 * 
 */
async function searchLocalePathsByPattern(pattern: string): Promise<string[]> {
  const localePattern = pattern.replaceAll('[locale]', `{${AVAILABLE_LOCALES.join(',')}}`);
  const paths = await glob(localePattern, {
    cwd: process.cwd(),
    ignore: DEFAULT_EXCLUDED_DIRECTORIES.map(dir => `${dir}/**`),
  });

  const localePaths: string[] = [];

  for (const path of paths) {
    const normalizedPath = normalizePath(path);
    if (normalizedPath !== null) {
      localePaths.push(normalizedPath);
    }
  }
  
  return localePaths;
}

/**
   * Searches and return for paths that are compatible with localisation purposes
   *
   * @returns {Promise<string[]>} - A promise that resolves to an array of paths. Example:
   * [
   *  'src/i18n/[locale].json',
   * ]
   */
async function searchLocalePaths(): Promise<string[]> {
  // Use simple pattern if only one file type, otherwise use brace expansion
  const pattern = SUPPORTED_FILE_TYPES.length === 1 
    ? `**/*.${SUPPORTED_FILE_TYPES[0]}`
    : `**/*.{${SUPPORTED_FILE_TYPES.join(',')}}`;
    
  const allJsonPaths = await glob(pattern, {
    cwd: process.cwd(),
    ignore: DEFAULT_EXCLUDED_DIRECTORIES.map(dir => `${dir}/**`),
  });

  const pathsWithLocales: string[] = [];
  
  for (const jsonPath of allJsonPaths) {
    const normalizedPath = normalizePath(jsonPath);
    if (normalizedPath !== null) {
      pathsWithLocales.push(normalizedPath);
    }
  }

  return Array.from(new Set(pathsWithLocales));
}

/**
 * Normalizes the path by replacing the locale with a placeholder.
 * 
 * @param filePath - The path to normalize.
 * @returns The normalized path.
 * 
 * Example: src/i18n/en-US/pages/home.json -> src/i18n/[locale]/pages/home.json
 */
function normalizePath(filePath: string): string | null {
  const relativeFilePath = path.relative(process.cwd(), filePath);
  const parts = relativeFilePath.split('/');

  let currentLocale = '';
  let normalizedPath = '';

  for(let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if(!part) {
      continue;
    }

    // Handle the last part of the path (filename)
    if(i === parts.length - 1) {
      const [filename, extension] = part.split('.');
      if(!currentLocale && availableLocales.has(filename ?? '')) {
        currentLocale = filename!;
      }
      if(filename === currentLocale) {
        normalizedPath += `[locale].${extension}`;
        continue;
      }
      normalizedPath += part;
      continue;
    }
      
    // There might be situations where there might be more than one locale in the path.
    // If the locale is already set, we should treat the other locale as a normal part of the path.
    //
    // (e.g.) src/i18n/en-US/pages/it-IT/home.json -> src/i18n/[locale]/pages/it-IT/home.json
    if(!currentLocale && availableLocales.has(part)) {
      currentLocale = part;
    }

    if(part === currentLocale) {
      normalizedPath += '[locale]/';
      continue;
    }
    normalizedPath += part + '/';
  }

  if(!currentLocale) {
    return null;
  }
  return normalizedPath;
}

export {
  getFileExtension,
  isRelative,
  readSafe,
  ensureDirectoryExists,
  buildLocalePath,
  searchLocalePathsByPattern,
  searchLocalePaths,
};
