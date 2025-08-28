import * as fs from 'fs/promises';
import path from 'path';

import {
  AVAILABLE_LOCALES,
  DEFAULT_EXCLUDED_DIRECTORIES,
  SUPPORTED_FILE_TYPES,
} from '#modules/common/common.const.js';

const DEFAULT_MAX_DEPTH_LEVEL = 6;

const availableLocales: Set<string> = new Set(AVAILABLE_LOCALES);
const defaultExcludedDirectories: Set<string> = new Set(DEFAULT_EXCLUDED_DIRECTORIES);

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
function buildPath(path: string, locale: string): string {
  return path.replaceAll('[locale]', locale);
}

/**
 * Searches for files by wildcard pattern
 * 
 * @param pattern - The pattern to search for. (e.g. 'src/i18n/en-US/*.json')
 * @returns A promise that resolves to an array of paths.
 */
async function searchFilePathsByWildcardPattern(pattern: string): Promise<string[]> {
  const lastSlashIndex = pattern.lastIndexOf('/');
  if (lastSlashIndex === -1) {
    throw new Error(`Invalid pattern: no directory separator found for ${pattern}`);
  }
  
  const rootPath = pattern.substring(0, lastSlashIndex + 1);
  const filePattern = pattern.substring(lastSlashIndex);
  
  if(!rootPath) {
    throw new Error(`Invalid pattern: no root path found for ${pattern}`);
  }
  if(!filePattern) {
    throw new Error(`Invalid pattern: no file pattern found for ${pattern}`);
  }

  const files = await fs.readdir(rootPath);

  const paths: string[] = [];
  for(const file of files) {
    if(!file.match(filePattern)) {
      continue;
    }

    paths.push(path.join(rootPath, file));
  }

  return paths
    .map((path) => normalizePath(path))
    .filter((path) => path !== null);
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
  const paths = await findAllEligibleFiles(process.cwd(), 0);

  const normalizedPaths = paths.map((path) => normalizePath(path)).filter((path) => path !== null);
  return Array.from(new Set(normalizedPaths));
}

/**
 * Finds all eligible files starting from the root path
 * 
 * @param rootPath - The root path to start searching from.
 * @param level - The current level of the search.
 * @returns A promise that resolves to an array of paths.
 */
async function findAllEligibleFiles(rootPath: string, level: number = 0): Promise<string[]> {
  const files = await fs.readdir(rootPath);
    
  const filePromises = files.map(async (file) => {
    const filePath = path.join(rootPath, file);
    const stats = await fs.stat(filePath);
     
    // Skip hidden files and directories
    if(file.startsWith('.')) {
      return [];
    }
  
    if (stats.isDirectory()) {
      // Skip excluded directories
      const isExcluded = defaultExcludedDirectories.has(file);
  
      if (level >= DEFAULT_MAX_DEPTH_LEVEL || isExcluded) {
        return [];
      }
  
      return await findAllEligibleFiles(filePath, level + 1);
    } 

    if (stats.isFile()) {
      // At root level (level 0), skip files - only process directories
      if (level === 0) {
        return [];
      }
      
      const extension = getFileExtension(filePath);
      if (SUPPORTED_FILE_TYPES.includes(extension)) {
        return [filePath];
      }
    }
      
    return [];
  });
  
  const results = await Promise.all(filePromises);
  return results.flat();
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
      
    // If the current substring is a locale, we should need to replace it with [locale].
    // There might be situations where there might be more than one locale in the path.
    // This is why we need to check if the current locale is already set, and treat it as a normal part of the path.
    //
    // Example:
    // src/i18n/en-US/pages/home.json -> src/i18n/[locale]/pages/home.json
    // src/i18n/en-US/pages/it-IT/home.json -> src/i18n/[locale]/pages/it-IT/home.json
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
  searchFilePathsByWildcardPattern,
  ensureDirectoryExists,
  buildPath,
  searchLocalePaths,
};
