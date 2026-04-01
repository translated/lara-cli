import { z } from 'zod/v4';

import { basename } from 'path';

import {
  LocalesEnum,
  SupportedExtensionEnum,
  SupportedFileTypesEnum,
} from '../common/common.types.js';
import { SEARCHABLE_EXTENSIONS, SUPPORTED_FILE_TYPES } from '../common/common.const.js';
import { getFileType, isRelative } from '#utils/path.js';

const LOCALE_FILENAME_PATTERN = new RegExp(
  `[^/]*\\[locale\\][^/]*\\.(${SEARCHABLE_EXTENSIONS.join('|')})$`
);

const IncludeFilePath = z
  .string()
  .refine((path) => isRelative(path), {
    message: 'Path must be relative (cannot start with /, ./, or ../)',
  })
  .refine(
    (path) => {
      const fileType = getFileType(path);
      return SUPPORTED_FILE_TYPES.includes(fileType);
    },
    {
      message: `Path must end with a valid file extension (${SUPPORTED_FILE_TYPES.map((type) => `.${type}`).join(', ')})`,
    }
  )
  .refine(
    (path) => {
      const hasDirectoryPattern =
        path.includes('/[locale]/') ||
        path.startsWith('[locale]/') ||
        path.includes('[locale].lproj/');
      const hasFilenamePattern = LOCALE_FILENAME_PATTERN.test(path);
      const isI18nFile = basename(path) === `i18n.${SupportedExtensionEnum.TS}`;
      const isVueFile = path.endsWith(SupportedExtensionEnum.VUE);
      const isXcstringsFile = path.endsWith('.xcstrings');

      return (
        hasDirectoryPattern || hasFilenamePattern || isI18nFile || isVueFile || isXcstringsFile
      );
    },
    {
      message:
        'Path must contain [locale] as either a directory ([locale]/, /[locale]/ or [locale].lproj/), or filename ([locale].extension), or be a Vue file, .xcstrings file, or be named i18n.ts',
    }
  );

const ExcludeFilePath = z.string().refine((path) => isRelative(path), {
  message: 'Path must be relative (cannot start with /, ./, or ../)',
});

const KeyPath = z
  .string()
  .refine((path) => !path.startsWith('/') && !path.endsWith('/'), {
    message: 'Key path cannot start or end with a slash',
  })
  .refine((path) => path.split('/').some((segment) => segment !== '*'), {
    message: 'Key path must contain at least one non-wildcard segment',
  });

const Config = z
  .object({
    version: z.string(),

    project: z
      .object({
        instruction: z.string().optional(),
      })
      .optional(),

    locales: z.object({
      source: LocalesEnum,
      target: z.array(LocalesEnum),
    }),

    memories: z.array(z.string()).default([]),

    glossaries: z.array(z.string()).default([]),

    files: z.partialRecord(
      SupportedFileTypesEnum,
      z.object({
        include: z.array(IncludeFilePath),
        exclude: z.array(ExcludeFilePath).default([]),
        fileInstructions: z
          .array(
            z.object({
              path: IncludeFilePath,
              instruction: z.string().optional(),
              keyInstructions: z
                .array(
                  z.object({
                    path: KeyPath,
                    instruction: z.string(),
                  })
                )
                .default([]),
            })
          )
          .default([]),
        keyInstructions: z
          .array(
            z.object({
              path: KeyPath,
              instruction: z.string(),
            })
          )
          .default([]),
        lockedKeys: z.array(KeyPath).default([]),
        ignoredKeys: z.array(KeyPath).default([]),
        includeKeys: z.array(KeyPath).default([]),
      })
    ),
  })
  .refine(
    (data) => {
      if (Object.keys(data.files).length === 0) {
        return false;
      }

      for (const [fileType, fileConfig] of Object.entries(data.files)) {
        if (!fileConfig) {
          return false;
        }

        for (const includePath of fileConfig.include) {
          const resolvedFileType = getFileType(includePath);

          if (resolvedFileType !== fileType) {
            return false;
          }
        }
      }
      return true;
    },
    {
      message: 'File type must match the file extension',
    }
  );

type ConfigType = z.infer<typeof Config>;

export { IncludeFilePath as FilePath, KeyPath, Config, type ConfigType };
