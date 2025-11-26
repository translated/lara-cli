import { z } from 'zod/v4';
import { AVAILABLE_LOCALES, SUPPORTED_FILE_TYPES } from './common.const.js';

export const LocalesEnum = z.enum(AVAILABLE_LOCALES);

export const SupportedFileTypesEnum = z.enum(SUPPORTED_FILE_TYPES);

export enum SupportedExtensionEnum {
  JSON = 'json',
  PO = 'po',
  TS = 'ts',
}
export type SearchLocalePathsOptions = {
  source: string;
};
