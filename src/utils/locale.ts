import { AVAILABLE_LOCALES, SEPARATOR_FILENAME_REGEX } from '#modules/common/common.const.js';
import { searchPaths } from './path.js';
import path from 'path';

const availableLocales: Set<string> = new Set(AVAILABLE_LOCALES);

async function extractLocaleFromPath(source: string): Promise<string[]> {
  const paths = await searchPaths();

  const targetLocales: Set<string> = new Set();

  for (const filePath of paths) {
    const relativeFilePath = path.relative(process.cwd(), filePath);
    const parts = relativeFilePath.split('/');

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) {
        continue;
      }

      // Handle the last part of the path (filename)
      if (i === parts.length - 1) {
        const lastDotIndex = part.lastIndexOf('.');
        const filename = lastDotIndex > -1 ? part.substring(0, lastDotIndex) : part;
        const { locale } = extractLocaleFromFilename(filename);
        if (!locale) {
          continue;
        }
        if (availableLocales.has(locale) && locale !== source) {
          targetLocales.add(locale);
        }
      }

      // There might be situations where there might be more than one locale in the path.
      // If the locale is already set, we should treat the other locale as a normal part of the path.
      //
      // (e.g.) src/i18n/en/pages/it-IT/home.json -> src/i18n/[locale]/pages/it-IT/home.json
      if (availableLocales.has(part) && part !== source) {
        targetLocales.add(part);
      }
    }
  }

  return Array.from(targetLocales);
}

/**
 * Extracts all locales found in the project paths.
 *
 * @returns A promise that resolves to an array of all locales found in the project.
 */
async function extractAllLocalesFromProject(): Promise<string[]> {
  const paths = await searchPaths();

  const foundLocales: Set<string> = new Set();

  for (const filePath of paths) {
    const relativeFilePath = path.relative(process.cwd(), filePath);
    const parts = relativeFilePath.split('/');

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) {
        continue;
      }

      // Handle the last part of the path (filename)
      if (i === parts.length - 1) {
        const lastDotIndex = part.lastIndexOf('.');
        const filename = lastDotIndex > -1 ? part.substring(0, lastDotIndex) : part;
        const { locale } = extractLocaleFromFilename(filename);
        if (!locale) {
          continue;
        }
        if (availableLocales.has(locale)) {
          foundLocales.add(locale);
        }
      }

      // There might be situations where there might be more than one locale in the path.
      // If the locale is already set, we should treat the other locale as a normal part of the path.
      //
      // (e.g.) src/i18n/en/pages/it-IT/home.json -> src/i18n/[locale]/pages/it-IT/home.json
      if (availableLocales.has(part)) {
        foundLocales.add(part);
      }
    }
  }

  return Array.from(foundLocales);
}

/**
 * Extracts a valid locale identifier from the beginning of a filename.
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
 * extractLocaleFromFilename("en-US.messages");
 * // Returns { locale: "en-US", rest: ".messages" }
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

  if (!locale) {
    locale = filename;
    rest = '';
  }

  return { locale, rest };
}

export { extractLocaleFromPath, extractAllLocalesFromProject, extractLocaleFromFilename };
