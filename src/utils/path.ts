import * as fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

import {
  AVAILABLE_LOCALES,
  DEFAULT_EXCLUDED_DIRECTORIES,
  SEPARATOR_FILENAME_REGEX,
  SUPPORTED_FILE_TYPES,
} from '#modules/common/common.const.js';
import { Messages } from '#messages/messages.js';
import { SearchPathsOptions } from '#cli/cmd/init/init.types.js';

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
 * @param locale - The locale to replace the placeholder with. Example: 'en'
 * @returns The built path. Example: 'src/i18n/en.json'
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
    ignore: DEFAULT_EXCLUDED_DIRECTORIES.map((dir) => `${dir}/**`),
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
async function searchLocalePaths(options?: SearchPathsOptions | undefined): Promise<string[]> {
  const allJsonPaths = await searchPaths(options);

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
 * Example: src/i18n/en/pages/home.json -> src/i18n/[locale]/pages/home.json
 */
function normalizePath(filePath: string): string | null {
  const relativeFilePath = path.relative(process.cwd(), filePath);
  const parts = relativeFilePath.split('/');

  let currentLocale = '';
  let normalizedPath = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) {
      continue;
    }

    // Handle the last part of the path (filename)
    if (i === parts.length - 1) {
      // Find the last dot to separate filename and extension
      const lastDotIndex = part.lastIndexOf('.');
      const filename = lastDotIndex > -1 ? part.substring(0, lastDotIndex) : part;
      const extension = lastDotIndex > -1 ? part.substring(lastDotIndex + 1) : '';
      const { locale, rest } = extractLocaleFromFilename(filename);

      if (!currentLocale && availableLocales.has(locale ?? '')) {
        currentLocale = locale;
      }
      if (locale === currentLocale) {
        normalizedPath += rest ? `[locale]${rest}.${extension}` : `[locale].${extension}`;
        continue;
      }
      normalizedPath += part;
      continue;
    }

    // There might be situations where there might be more than one locale in the path.
    // If the locale is already set, we should treat the other locale as a normal part of the path.
    //
    // (e.g.) src/i18n/en/pages/it-IT/home.json -> src/i18n/[locale]/pages/it-IT/home.json
    if (!currentLocale && availableLocales.has(part)) {
      currentLocale = part;
    }

    if (part === currentLocale) {
      normalizedPath += '[locale]/';
      continue;
    }
    normalizedPath += part + '/';
  }

  if (!currentLocale) {
    return null;
  }
  return normalizedPath;
}

/**
 * Extracts all paths from the current working directory
 *
 * @returns A promise that resolves to an array of paths.
 *
 * Example:
 * [
 *  'src/i18n/en.json',
 *  'src/i18n/it.json',
 * ]
 */
async function searchPaths(options?: SearchPathsOptions | undefined): Promise<string[]> {
  if (SUPPORTED_FILE_TYPES.length === 0) {
    throw new Error(Messages.errors.noSupportedFileTypes);
  }

  let pattern: string;
  const source = options?.source;

  // If source is provided, search for paths that start with the source locale
  // Pattern that matches: source.ext, source-*.ext, source_*.ext, source.*.ext
  if (source) {
    if (SUPPORTED_FILE_TYPES.length === 1) {
      const ext = SUPPORTED_FILE_TYPES[0];
      pattern = `**/${source}{.${ext},-*.${ext},_*.${ext},.*.${ext}}`;
    } else {
      const extensions = SUPPORTED_FILE_TYPES.join(',');
      pattern = `**/${source}{.{${extensions}},-*.{${extensions}},_*.{${extensions}},.*.{${extensions}}}`;
    }
  } else {
    pattern =
      SUPPORTED_FILE_TYPES.length === 1
        ? `**/*.${SUPPORTED_FILE_TYPES[0]}`
        : `**/*.{${SUPPORTED_FILE_TYPES.join(',')}}`;
  }

  return glob(pattern, {
    cwd: process.cwd(),
    ignore: DEFAULT_EXCLUDED_DIRECTORIES.map((dir) => `${dir}/**`),
  });
}

export {
  getFileExtension,
  isRelative,
  readSafe,
  ensureDirectoryExists,
  buildLocalePath,
  searchLocalePathsByPattern,
  searchLocalePaths,
  searchPaths,
};

/**
 * Extracts a valid locale identifier from the beginning of a filename.
 *
 * This function attempts to find the longest valid locale match at the start of the filename,
 * using common separators (dots, hyphens, underscores) as split points. The locale is validated
 * against the available locales set.
 *
 * @param {string} filename - The filename to extract the locale from (e.g., "en-US.messages", "it_IT-common")
 * @returns {{ locale: string; rest: string }} An object containing:
 *   - `locale`: The extracted locale identifier (or the entire filename if no valid locale found)
 *   - `rest`: The remaining part of the filename after the locale (including the separator)
 *
 * @example
 * // Returns { locale: "en-US", rest: ".messages" }
 * extractLocaleFromFilename("en-US.messages");
 */
function extractLocaleFromFilename(filename: string): { locale: string; rest: string } {
  // Try to find a valid locale at the start of the filename
  let locale = '';
  let rest = '';
  let bestMatchLength = 0;

  // Try to find the longest valid locale match
  for (let i = 0; i < filename.length; i++) {
    // Find all possible split points (dots, hyphens, underscores)
    if (SEPARATOR_FILENAME_REGEX.test(filename[i] ?? '') || i === filename.length - 1) {
      const endIndex = i === filename.length - 1 ? filename.length : i;
      const potentialLocale = filename.substring(0, endIndex);

      // Check if this is a valid locale and if it's the longest match
      if (availableLocales.has(potentialLocale) && potentialLocale.length > bestMatchLength) {
        bestMatchLength = potentialLocale.length;
        locale = potentialLocale;
        rest = filename.substring(endIndex);
      }
    }
  }

  // If no valid locale found, treat the whole filename as locale candidate
  if (!locale) {
    locale = filename;
    rest = '';
  }

  return { locale, rest };
}
