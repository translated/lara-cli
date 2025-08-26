import { z } from 'zod/v4';
import { AVAILABLE_LOCALES } from './common.const.js';

export const LocalesEnum = z.enum(AVAILABLE_LOCALES);

export type LocalesType = z.infer<typeof LocalesEnum>;
