import * as fs from 'fs/promises';
import path from 'path';
import { AVAILABLE_LOCALES } from '../common/common.const.js';

class PathSearcher {
  private readonly ALLOWED_EXTENSIONS = [
    'json'
  ];

  private readonly DEFAULT_EXCLUDED_DIRECTORIES = [
    'node_modules',
    'dist',
    'build',
    'bin',
    'out',
    'spec',
    'test',
    'tests',
    'coverage',
    'temp',
    'tmp'
  ];

  private readonly MAX_DEPTH_LEVEL = 6;

  private readonly availableLocalesSet: Set<string> = new Set(AVAILABLE_LOCALES);

  /**
   * Searches and return for paths that are compatible with localisation purposes
   *
   * @returns {Promise<string[]>} - A promise that resolves to an array of paths
   */
  public async searchPaths(): Promise<string[]> {
    const paths = await this.findAllEligibleFilesInRoot();

    const normalizedPaths = paths.map((path) => this.normalizePath(path)).filter((path) => path !== null);
    return Array.from(new Set(normalizedPaths));
  }

  private async findAllEligibleFilesInRoot(): Promise<string[]> {
    const rootPath = process.cwd();

    const files = await fs.readdir(rootPath);

    const paths: string[] = [];
    for(const file of files) {
      const stats = await fs.stat(file);

      if(stats.isDirectory()) {
        // Skip hidden files and directories
        const isExcluded = this.DEFAULT_EXCLUDED_DIRECTORIES.includes(file) || file.startsWith('.');

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
        const isExcluded = this.DEFAULT_EXCLUDED_DIRECTORIES.includes(file);
  
        if (level >= this.MAX_DEPTH_LEVEL || isExcluded) {
          return [];
        }
  
        return await this.findAllEligibleFiles(filePath, level + 1);
      } else if (stats.isFile()) {
        const extension = path.extname(filePath).slice(1);
        if (this.ALLOWED_EXTENSIONS.includes(extension)) {
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

    for(const part of parts) {
      // If the current substring is a locale, we should need to replace it with [locale].
      // There might be situations where there might be more than one locale in the path.
      // This is why we need to check if the current locale is already set, and treat it as a normal part of the path.
      if(!currentLocale && this.availableLocalesSet.has(part)) {
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

    // Remove trailing slash
    return normalizedPath.replace(/\/$/, '');
  }
}

export default PathSearcher;
