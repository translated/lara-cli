import { existsSync } from 'fs';
import Ora from 'ora';
import { confirm, input } from '@inquirer/prompts';
import { LaraApiError } from '@translated/lara';

import { LocalesEnum } from '#modules/common/common.types.js';
import { handleLaraApiError } from '#utils/error.js';
import { Messages } from '#messages/messages.js';
import customSearchableSelect from '#utils/prompt.js';
import { addIdToConfig } from './config-sync.js';

/**
 * Resolves a required free-text value: returns the trimmed argument when given,
 * prompts for it in interactive mode, or exits with `missingError` otherwise.
 */
export async function resolveText(
  value: string | undefined,
  interactive: boolean,
  promptMessage: string,
  missingError: () => string
): Promise<string> {
  const trimmed = value?.trim();
  if (trimmed) {
    return trimmed;
  }

  if (!interactive) {
    Ora({ text: missingError(), color: 'red' }).fail();
    process.exit(1);
  }

  const answer = (await input({ message: promptMessage })).trim();
  if (!answer) {
    Ora({ text: missingError(), color: 'red' }).fail();
    process.exit(1);
  }

  return answer;
}

/**
 * Resolves a required locale code, validating it against the supported locales.
 */
export async function resolveLocale(
  value: string | undefined,
  interactive: boolean,
  promptMessage: string,
  missingError: () => string
): Promise<string> {
  const trimmed = value?.trim();
  if (trimmed) {
    const parsed = LocalesEnum.safeParse(trimmed);
    if (!parsed.success) {
      Ora({ text: Messages.errors.invalidLocale(trimmed), color: 'red' }).fail();
      process.exit(1);
    }
    return parsed.data;
  }

  if (!interactive) {
    Ora({ text: missingError(), color: 'red' }).fail();
    process.exit(1);
  }

  const answer = await input({
    message: promptMessage,
    validate: (v) =>
      LocalesEnum.safeParse(v.trim()).success || Messages.errors.invalidLocale(v.trim()),
  });

  return answer.trim();
}

/**
 * Resolves a path to an existing file, prompting in interactive mode.
 */
export async function resolveFilePath(
  value: string | undefined,
  interactive: boolean,
  promptMessage: string
): Promise<string> {
  let filePath = value?.trim();

  if (!filePath) {
    if (!interactive) {
      Ora({ text: Messages.errors.filePathRequired, color: 'red' }).fail();
      process.exit(1);
    }
    filePath = (await input({ message: promptMessage })).trim();
    if (!filePath) {
      Ora({ text: Messages.errors.filePathRequired, color: 'red' }).fail();
      process.exit(1);
    }
  }

  if (!existsSync(filePath)) {
    Ora({ text: Messages.errors.fileNotFound(filePath), color: 'red' }).fail();
    process.exit(1);
  }

  return filePath;
}

/**
 * Asks for confirmation of a destructive action. Returns true to proceed, or
 * false (printing a cancellation notice) when declined.
 */
export async function confirmOrCancel(message: string): Promise<boolean> {
  const confirmed = await confirm({ message, default: false });
  if (!confirmed) {
    Ora({ text: Messages.info.operationCancelled, color: 'blue' }).info();
    return false;
  }
  return true;
}

/**
 * Resolves the id of a memory/glossary: returns the given id, or (interactively)
 * fetches the list and lets the user pick one. Exits when the id is required but
 * missing, the list is empty, or no selection is made.
 */
export async function resolveResourceId(options: {
  id: string | undefined;
  interactive: boolean;
  fetch: () => Promise<{ id: string; name: string }[]>;
  fetchingMessage: string;
  gettingError: string;
  missingIdError: string;
  emptyWarning: string;
  promptMessage: string;
}): Promise<string> {
  const trimmed = options.id?.trim();
  if (trimmed) {
    return trimmed;
  }

  if (!options.interactive) {
    Ora({ text: options.missingIdError, color: 'red' }).fail();
    process.exit(1);
  }

  const spinner = Ora().start(options.fetchingMessage);

  let items: { id: string; name: string }[];
  try {
    items = await options.fetch();
  } catch (error) {
    if (error instanceof LaraApiError) {
      handleLaraApiError(error, options.gettingError, spinner);
      return process.exit(1);
    }
    throw error;
  }

  if (items.length === 0) {
    spinner.warn(options.emptyWarning);
    return process.exit(0);
  }

  spinner.stop();

  const [selected] = await customSearchableSelect({
    message: options.promptMessage,
    multiple: false,
    choices: items.map((item) => ({ label: `${item.name} (${item.id})`, value: item.id })),
  });

  if (!selected) {
    return process.exit(0);
  }

  return selected;
}

/**
 * After creating a resource, optionally adds its id to lara.yaml (prompting in
 * interactive mode, automatic otherwise) and reports the change.
 */
export async function maybeAddToConfig(
  kind: 'memories' | 'glossaries',
  id: string,
  interactive: boolean,
  promptMessage: string
): Promise<void> {
  const shouldAdd = interactive ? await confirm({ message: promptMessage, default: true }) : true;

  if (!shouldAdd) {
    return;
  }

  if (addIdToConfig(kind, id)) {
    Ora({ color: 'green' }).succeed(Messages.success.addedToConfig(id));
  }
}
