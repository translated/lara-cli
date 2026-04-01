import { AVAILABLE_LOCALES } from '#modules/common/common.const.js';
import { extractLocaleFromFilename, searchPaths, readSafe } from './path.js';
import path from 'path';
import { ParserFactory } from '../parsers/parser.factory.js';
import { SupportedExtensionEnum } from '#modules/common/common.types.js';

const availableLocales: Set<string> = new Set(AVAILABLE_LOCALES);

/**
 * Extracts all locales found in the file.
 *
 * @param filePath - The path to the file to extract locales from.
 * @param filterOutLocale - The locale to filter out.
 * @returns A promise that resolves to an array of locales found in the file.
 */
async function extractLocalesFromFile(
  filePath: string,
  filterOutLocale?: string
): Promise<string[]> {
  try {
    const content = await readSafe(filePath);
    const parser = new ParserFactory(filePath);
    const parsed = parser.parse(content);
    const locales = new Set<string>();

    for (const key of Object.keys(parsed)) {
      const root = key.split('\0')[0];
      if (root && availableLocales.has(root) && (!filterOutLocale || root !== filterOutLocale)) {
        locales.add(root);
      }
    }
    return Array.from(locales);
  } catch {
    return [];
  }
}

/**
 * Extracts locales from an .xcstrings file by reading the localizations keys.
 *
 * @param filePath - Path to the .xcstrings file.
 * @param filterOutLocale - Optional locale to exclude from results.
 * @returns A promise that resolves to an array of locale codes found.
 */
async function extractLocalesFromXcstrings(
  filePath: string,
  filterOutLocale?: string
): Promise<string[]> {
  try {
    const content = await readSafe(filePath);
    const parsed = JSON.parse(content);
    const locales = new Set<string>();

    if (parsed?.strings && typeof parsed.strings === 'object') {
      for (const entry of Object.values(parsed.strings) as Array<Record<string, unknown>>) {
        const localizations = entry?.localizations;
        if (localizations && typeof localizations === 'object') {
          for (const locale of Object.keys(localizations as object)) {
            if (availableLocales.has(locale) && (!filterOutLocale || locale !== filterOutLocale)) {
              locales.add(locale);
            }
          }
        }
      }
    }

    // Also check sourceLanguage field
    if (parsed?.sourceLanguage && availableLocales.has(parsed.sourceLanguage)) {
      if (!filterOutLocale || parsed.sourceLanguage !== filterOutLocale) {
        locales.add(parsed.sourceLanguage);
      }
    }

    return Array.from(locales);
  } catch {
    return [];
  }
}

/**
 * Extracts all locales found in paths.
 *
 * @param source - The source locale.
 * @returns A promise that resolves to an array of locales found in the path.
 */
async function extractLocaleFromPath(source: string): Promise<string[]> {
  const paths = await searchPaths();

  const targetLocales: Set<string> = new Set();

  for (const filePath of paths) {
    if (path.basename(filePath) === `i18n.${SupportedExtensionEnum.TS}`) {
      const locales = await extractLocalesFromFile(filePath, source);
      for (const locale of locales) {
        targetLocales.add(locale);
      }
      continue;
    }

    if (filePath.endsWith(SupportedExtensionEnum.VUE)) {
      const locales = await extractLocalesFromFile(filePath, source);
      for (const locale of locales) {
        targetLocales.add(locale);
      }
      continue;
    }

    // .xcstrings files contain all locales in one file — parse to extract
    if (filePath.endsWith('.xcstrings')) {
      const locales = await extractLocalesFromXcstrings(filePath, source);
      for (const locale of locales) {
        targetLocales.add(locale);
      }
      continue;
    }

    if (filePath.endsWith(`.${SupportedExtensionEnum.TS}`)) {
      continue;
    }

    const relativeFilePath = path.relative(process.cwd(), filePath);
    const parts = relativeFilePath.split('/');

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) {
        continue;
      }

      // Handle the last part of the path (filename)
      if (i === parts.length - 1) {
        const locale = extractLocaleFromFilename(part);
        if (!locale) {
          continue;
        }
        if (availableLocales.has(locale) && locale !== source) {
          targetLocales.add(locale);
        }
      }

      // Handle .lproj directories (e.g., en.lproj -> en)
      const lprojMatch = part.match(/^(.+)\.lproj$/);
      if (
        lprojMatch &&
        lprojMatch[1] &&
        availableLocales.has(lprojMatch[1]) &&
        lprojMatch[1] !== source
      ) {
        targetLocales.add(lprojMatch[1]);
        continue;
      }

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
    if (path.basename(filePath) === `i18n.${SupportedExtensionEnum.TS}`) {
      const locales = await extractLocalesFromFile(filePath);
      for (const locale of locales) {
        foundLocales.add(locale);
      }
      continue;
    }

    if (filePath.endsWith(SupportedExtensionEnum.VUE)) {
      const locales = await extractLocalesFromFile(filePath);
      for (const locale of locales) {
        foundLocales.add(locale);
      }
      continue;
    }

    // .xcstrings files contain all locales in one file — parse to extract
    if (filePath.endsWith('.xcstrings')) {
      const locales = await extractLocalesFromXcstrings(filePath);
      for (const locale of locales) {
        foundLocales.add(locale);
      }
      continue;
    }

    if (filePath.endsWith(`.${SupportedExtensionEnum.TS}`)) {
      continue;
    }

    const relativeFilePath = path.relative(process.cwd(), filePath);
    const parts = relativeFilePath.split('/');

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) {
        continue;
      }

      // Handle the last part of the path (filename)
      if (i === parts.length - 1) {
        const locale = extractLocaleFromFilename(part);
        if (!locale) {
          continue;
        }
        if (availableLocales.has(locale)) {
          foundLocales.add(locale);
        }
      }

      // Handle .lproj directories (e.g., en.lproj -> en)
      const lprojMatch = part.match(/^(.+)\.lproj$/);
      if (lprojMatch && lprojMatch[1] && availableLocales.has(lprojMatch[1])) {
        foundLocales.add(lprojMatch[1]);
        continue;
      }

      if (availableLocales.has(part)) {
        foundLocales.add(part);
      }
    }
  }

  return Array.from(foundLocales);
}

export { extractLocaleFromPath, extractAllLocalesFromProject };
