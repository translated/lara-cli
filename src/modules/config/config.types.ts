import { z } from 'zod';
import { LocalesEnum } from '../common/common.types.js';

const FileType = z.enum(['json']);

const FileConfig = z.object({
  include: z.array(z.string()),
  exclude: z.array(z.string()),
});

export const Config = z.object({
  locales: z.object({
    source: LocalesEnum,
    target: z.array(LocalesEnum),
  }),
  paths: z.record(FileType, FileConfig)
});

export type ConfigType = z.infer<typeof Config>;
