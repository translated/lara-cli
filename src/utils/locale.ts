import { AVAILABLE_LOCALES } from '#modules/common/common.const.js';
import { searchPaths } from './path.js';
import path from 'path';

const availableLocales: Set<string> = new Set(AVAILABLE_LOCALES);

async function extractLocaleFromPath(source: string): Promise<string[]> {
  const paths = await searchPaths();

  const targetLocales: Set<string> = new Set();

  for(const filePath of paths) {
    const relativeFilePath = path.relative(process.cwd(), filePath);
    const parts = relativeFilePath.split('/');

    for(let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if(!part) {
        continue;
      }
    
      // Handle the last part of the path (filename)
      if(i === parts.length - 1) {
        const [filename] = part.split('.');
        if(!filename) {
          continue;
        }
        if(availableLocales.has(filename) && filename !== source) {
          targetLocales.add(filename);
        }
      }
          
      // There might be situations where there might be more than one locale in the path.
      // If the locale is already set, we should treat the other locale as a normal part of the path.
      //
      // (e.g.) src/i18n/en/pages/it-IT/home.json -> src/i18n/[locale]/pages/it-IT/home.json
      if(availableLocales.has(part) && part !== source) {
        targetLocales.add(part);
      }

    }
  }

  return Array.from(targetLocales);
}

export {
  extractLocaleFromPath
};
