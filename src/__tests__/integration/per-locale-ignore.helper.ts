import { expect } from 'vitest';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

import yaml from 'yaml';

import { executeCommand } from './test-helpers.js';
import initCommand from '../../cli/cmd/init/init.js';
import translateCommand from '../../cli/cmd/translate/translate.js';
import { ConfigProvider } from '#modules/config/config.provider.js';

/**
 * Format adapter for {@link runPerLocaleIgnoreScenario}. The source holds two
 * keys: the ignored one, whose value contains "Secret old", and a control one,
 * whose value contains "Plain old". The scenario switches both to "new".
 */
export type PerLocaleIgnoreFormat = {
  /** Key under `files` in lara.yaml (e.g. `json`, `xml`, `xcode-strings`). */
  fileType: string;
  /** Value passed to `init --paths`. */
  paths: string;
  /** Key pattern of the entry to ignore. */
  ignoredKey: string;
  /** Path of a locale's file, relative to the project. Same for every locale in single-file formats. */
  file: (locale: string) => string;
  /** Initial source content. */
  source: string;
};

/** Runs `init` non-interactively with the given targets and include path. */
export async function initProject(targets: string, paths: string): Promise<void> {
  await executeCommand(initCommand, [
    '--non-interactive',
    '--source',
    'en',
    '--target',
    targets,
    '--paths',
    paths,
  ]);
  (ConfigProvider as any).instance = null;
}

/** Structurally edits lara.yaml, then reloads it. */
export async function patchConfig(testDir: string, mutate: (config: any) => void): Promise<void> {
  const configPath = path.join(testDir, 'lara.yaml');
  const config = yaml.parse(await readFile(configPath, 'utf-8'));
  mutate(config);
  await writeFile(configPath, yaml.stringify(config));
  (ConfigProvider as any).instance = null;
}

/**
 * Replaces quote-delimited occurrences only, so `"Secret old"` in the source
 * changes but `"[it] Secret old"` in a translation stored in the same file does not.
 */
function replaceQuoted(content: string, from: string, to: string): string {
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const updated = content.replace(new RegExp(`(["'])${escaped}\\1`, 'g'), `$1${to}$1`);
  if (updated === content) {
    throw new Error(`replaceQuoted: no quoted "${from}" found`);
  }
  return updated;
}

/**
 * End-to-end scenario for `ignoredKeys: [{ path, locales }]` with several
 * target locales:
 *
 * 1. No rule, targets it+fr: both locales get every key.
 * 2. Rule for fr only, source values change: it is re-translated, fr keeps its
 *    old value for the ignored key while its other key is re-translated.
 * 3. New target de added to the rule: de never receives the ignored key,
 *    it and fr are unaffected, and the source is still intact.
 */
export async function runPerLocaleIgnoreScenario(
  testDir: string,
  format: PerLocaleIgnoreFormat
): Promise<void> {
  const read = (locale: string) => readFile(path.join(testDir, format.file(locale)), 'utf-8');
  const sourcePath = path.join(testDir, format.file('en'));
  // Single-file formats (i18n.ts, Vue, .xcstrings) store every locale in the source file.
  const singleFile = format.file('en') === format.file('it');

  await mkdir(path.dirname(sourcePath), { recursive: true });
  await writeFile(sourcePath, format.source);
  await initProject('it,fr', format.paths);

  // Phase 1: no rule.
  await executeCommand(translateCommand, []);
  for (const locale of ['it', 'fr']) {
    const content = await read(locale);
    expect(content).toContain(`[${locale}] Secret old`);
    expect(content).toContain(`[${locale}] Plain old`);
  }

  // Phase 2: ignore the key for fr only, then change the source.
  await patchConfig(testDir, (config) => {
    config.files[format.fileType].ignoredKeys = [{ path: format.ignoredKey, locales: ['fr'] }];
  });
  const replace = singleFile
    ? replaceQuoted
    : (content: string, from: string, to: string) => content.replaceAll(from, to);
  const current = await readFile(sourcePath, 'utf-8');
  await writeFile(
    sourcePath,
    replace(replace(current, 'Secret old', 'Secret new'), 'Plain old', 'Plain new')
  );
  await executeCommand(translateCommand, []);

  const it2 = await read('it');
  expect(it2).toContain('[it] Secret new');
  expect(it2).toContain('[it] Plain new');
  expect(it2).not.toContain('[it] Secret old');

  const fr2 = await read('fr');
  expect(fr2).toContain('[fr] Secret old');
  expect(fr2).not.toContain('[fr] Secret new');
  expect(fr2).toContain('[fr] Plain new');

  // Phase 3: add de as a target, ignored too.
  await patchConfig(testDir, (config) => {
    config.locales.target = ['it', 'fr', 'de'];
    config.files[format.fileType].ignoredKeys = [
      { path: format.ignoredKey, locales: ['fr', 'de'] },
    ];
  });
  await executeCommand(translateCommand, []);

  const de3 = await read('de');
  expect(de3).toContain('[de] Plain new');
  expect(de3).not.toContain('[de] Secret');

  const fr3 = await read('fr');
  expect(fr3).toContain('[fr] Secret old');
  expect(fr3).not.toContain('[fr] Secret new');

  const it3 = await read('it');
  expect(it3).toContain('[it] Secret new');

  // The source must still hold the ignored key: an untranslated occurrence, not "[xx] Secret new".
  expect(await read('en')).toMatch(/(?<!\] )Secret new/);
}
