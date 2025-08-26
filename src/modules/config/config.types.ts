import { z } from 'zod/v4';

import { SUPPORTED_FILE_TYPES } from './config.const.js';
import { LocalesEnum } from '../common/common.types.js';

export const IncludePath = z.string()
  .min(1, 'Path cannot be empty')
  .refine((path) => {
    const supportedExtensions = SUPPORTED_FILE_TYPES.map(ext => `.${ext}`);
    return supportedExtensions.some(ext => path.endsWith(ext));
  }, {
    error: `File must end with one of the supported extensions: ${SUPPORTED_FILE_TYPES.map(ext => `.${ext}`).join(', ')}`
  })
  .refine((path) => {
    return !path.includes('..') && !path.startsWith('/');
  }, {
    error: 'Path cannot contain ".." or start with "/" (absolute path)'
  })
  .refine((path) => {
    const localePattern = /\[locale\]/g;
    const matches = path.match(localePattern);
    
    if (!matches) {
      return false;
    }
    
    // Check if [locale] is used as a folder (followed by /) or as a file (followed by . or end of string)
    const validPatterns = [
      /\[locale\]\//, // [locale] as folder
      /\[locale\]\.[^/]+$/, // [locale] as file (with extension at end)
      /\/\[locale\]$/ // [locale] as final folder/file without extension
    ];
    
    return validPatterns.some(pattern => pattern.test(path));
  }, {
    error: 'Path must contain at least one "[locale]" as a folder or as a file (e.g., folder/[locale]/file.json, folder/[locale].json, folder/[locale]/[locale].json)'
  })
  .refine((path) => {
    return !/[<>:"|*?]/.test(path);
  }, {
    error: 'Invalid characters in file path'
  });

export const ExcludePath = z.string()
  .min(1, 'Path cannot be empty')
  .refine((path) => {
    return !path.includes('..') && !path.startsWith('/');
  }, {
    error: 'Path cannot contain ".." or start with "/" (absolute path)'
  })
  .refine((path) => {
    // Check if the path contains a valid pattern characters (e.g., src/*, src/**, src/**/*, etc.)
    return !/[<>:"|]/.test(path);
  }, {
    error: 'Invalid characters in path or pattern'
  });

const FileConfig = z.object({
  include: z.array(IncludePath),
  exclude: z.array(ExcludePath),
});

export const Config = z.object({
  locales: z.object({
    source: LocalesEnum,
    target: z.array(LocalesEnum),
  }),
  paths: z.record(z.enum(SUPPORTED_FILE_TYPES), FileConfig)
});

export type ConfigType = z.infer<typeof Config>;
