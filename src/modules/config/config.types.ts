import { z } from 'zod/v4';

import { LocalesEnum, SupportedFileTypesEnum } from '../common/common.types.js';
import { SUPPORTED_FILE_TYPES } from '../common/common.const.js';
import { getFileExtension, isRelative } from '#utils/path.js';

const IncludeFilePath = z
  .string()
  .refine((path) => isRelative(path), {
    message: 'Path must be relative (cannot start with /, ./, or ../)',
  })
  .refine(
    (path) => {
      const fileExtension = getFileExtension(path);
      return SUPPORTED_FILE_TYPES.includes(fileExtension);
    },
    {
      message: `Path must end with a valid file extension (${SUPPORTED_FILE_TYPES.map((type) => `.${type}`).join(', ')})`,
    }
  )
  .refine(
    (path) => {
      const hasDirectoryPattern = path.includes('/[locale]/');
      const hasFilenamePattern = new RegExp(
        `[^/]*\\[locale\\][^/]*\\.(${SUPPORTED_FILE_TYPES.join('|')})$`
      ).test(path);
      const isI18nFile = path.endsWith('i18n.ts');
      const isVueFile = path.endsWith('.vue');

      return hasDirectoryPattern || hasFilenamePattern || isI18nFile || isVueFile;
    },
    {
      message:
        'Path must contain [locale] as either a directory (/[locale]/) or filename ([locale].extension), or be a Vue file, or be named i18n.ts',
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
          const fileExtension = getFileExtension(includePath);

          if (fileExtension !== fileType) {
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
