import * as fs from 'fs/promises';
import path from 'path';

import {
  AVAILABLE_LOCALES,
  DEFAULT_EXCLUDED_DIRECTORIES,
  DEFAULT_MAX_DEPTH_LEVEL,
  SUPPORTED_FILE_TYPES,
} from '../common/common.const.js';

class PathLocator {

  private readonly availableLocales: Set<string>;
  private readonly defaultExcludedDirectories: Set<string>;

  constructor() {
    this.availableLocales = new Set(AVAILABLE_LOCALES);
    this.defaultExcludedDirectories = new Set(DEFAULT_EXCLUDED_DIRECTORIES);
  }

  /**
   * Builds a path by replacing the [locale] placeholder with the given locale
   *
   * @param path - The path to build. Example: 'src/i18n/[locale].json'
   * @param locale - The locale to replace the placeholder with. Example: 'en-US'
   * @returns The built path. Example: 'src/i18n/en-US.json'
   */
  public buildPath(path: string, locale: string): string {
    return path.replace('[locale]', locale);
  }

  /**
   * Searches and return for paths that are compatible with localisation purposes
   *
   * @returns {Promise<string[]>} - A promise that resolves to an array of paths. Example:
   * [
   *  'src/i18n/[locale].json',
   * ]
   */
  public async searchPaths(): Promise<string[]> {
    const paths = await this.findAllEligibleFilesInRoot();

    const normalizedPaths = paths.map((path) => this.normalizePath(path)).filter((path) => path !== null);
    return Array.from(new Set(normalizedPaths));
  }

  /**
   * Finds all eligible files in the root path
   *
   * @returns {Promise<string[]>} - A promise that resolves to an array of paths. Example:
   * [
   *  'src/i18n/en-US.json',
   *  'src/i18n/it-IT.json',
   * ]
   */
  private async findAllEligibleFilesInRoot(): Promise<string[]> {
    const rootPath = process.cwd();

    const files = await fs.readdir(rootPath);

    const paths: string[] = [];

    // This first loop is to find all the directories in the root path.
    // We do not want to search in the files inside the root path.
    for(const file of files) {
      const stats = await fs.stat(file);

      if(stats.isDirectory()) {
        // Skip hidden files and directories, along with default excluded directories
        const isExcluded = this.defaultExcludedDirectories.has(file) || file.startsWith('.');

        if(!isExcluded) {
          paths.push(...await this.findAllEligibleFiles(path.join(rootPath, file)));
        }
      }
    }

    return paths;
  }

  private async findAllEligibleFiles(rootPath: string, level: number = 0): Promise<string[]> {
    const files = await fs.readdir(rootPath);
    
    const filePromises = files.map(async (file) => {
      const filePath = path.join(rootPath, file);
      const stats = await fs.stat(filePath);
     
      // Skip hidden files and directories
      if(file.startsWith('.')) {
        return [];
      }
  
      if (stats.isDirectory()) {
        const isExcluded = this.defaultExcludedDirectories.has(file);
  
        if (level >= DEFAULT_MAX_DEPTH_LEVEL || isExcluded) {
          return [];
        }
  
        return await this.findAllEligibleFiles(filePath, level + 1);
      } 

      if (stats.isFile()) {
        const extension = path.extname(filePath).slice(1);
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
   * Normalizes the path by replacing the locale with a placeholder
   *
   * @param filePath - The path to normalize
   * @returns The normalized path or null if the locale is not found
   */
  private normalizePath(filePath: string): string | null {
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
        if(!currentLocale && this.availableLocales.has(filename ?? '')) {
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
      if(!currentLocale && this.availableLocales.has(part)) {
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
}

export default new PathLocator();
