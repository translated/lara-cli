import z from "zod";

export const LocalesEnum = z.enum([
  'en',
  'zh',
  'ja',
  'ko',
  'fr',
  'de',
  'es',
  'it',
  'pt',
  'ru',
]);

export type LocalesType = z.infer<typeof LocalesEnum>;
