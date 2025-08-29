import { z } from 'zod/v4';

import { LocalesEnum, SupportedFileTypesEnum } from '../common/common.types.js';
import { SUPPORTED_FILE_TYPES } from '../common/common.const.js';
import { getFileExtension, isRelative } from '#utils/path.js';

const FilePath = z.string()
  .refine((path) => isRelative(path), {
    message: 'Path must be relative (cannot start with /, ./, or ../)',
  })
  .refine((path) => {
    const fileExtension = getFileExtension(path);
    return SUPPORTED_FILE_TYPES.includes(fileExtension);
  }, {
    message: `Path must end with a valid file extension (${SUPPORTED_FILE_TYPES.map((type) => `.${type}`).join(', ')})`,
  })
  .refine((path) => {
    const hasDirectoryPattern = path.includes('/[locale]/');
    const hasFilenamePattern = /\[locale\]\.[a-zA-Z0-9]+$/.test(path);
    
    return hasDirectoryPattern || hasFilenamePattern;
  }, {
    message: 'Path must contain [locale] as either a directory (/[locale]/) or filename ([locale].extension)',
  });

const KeyPath = z.string()
  .refine((path) => !path.startsWith('/') && !path.endsWith('/'), {
    message: 'Key path cannot start or end with a slash',
  })
  .refine((path) => path.split('/').some((segment) => segment !== '*'), {
    message: 'Key path must contain at least one non-wildcard segment',
  })


const Config = z.object({
  version: z.string(),

  locales: z.object({
    source: LocalesEnum,
    target: z.array(LocalesEnum),
  }),

  files: z.record(SupportedFileTypesEnum, z.object({
    include: z.array(FilePath),
    exclude: z.array(FilePath).default([]),
    lockedKeys: z.array(KeyPath).default([]),
    ignoredKeys: z.array(KeyPath).default([]),
  })),
}).refine((data) => {
  for (const [fileType, fileConfig] of Object.entries(data.files)) {
    for (const includePath of fileConfig.include) {
      const fileExtension = getFileExtension(includePath);
      
      if (fileExtension !== fileType) {
        return false;
      }
    }
  }
  return true;
}, {
  message: 'File type must match the file extension',
});

type ConfigType = z.infer<typeof Config>;

export {
  FilePath,
  KeyPath,
  Config,
  type ConfigType,
};
