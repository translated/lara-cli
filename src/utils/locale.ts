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
      const root = key.split('/')[0];
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
 * Extracts all locales found in paths.
 *
 * @param source - The source locale.
 * @returns A promise that resolves to an array of locales found in the path.
 */
async function extractLocaleFromPath(source: string): Promise<string[]> {
  const paths = await searchPaths();

  const targetLocales: Set<string> = new Set();

  for (const filePath of paths) {
    if (filePath.endsWith(`i18n.${SupportedExtensionEnum.TS}`)) {
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
    if (filePath.endsWith(`i18n.${SupportedExtensionEnum.TS}`)) {
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

export { extractLocaleFromPath, extractAllLocalesFromProject };
