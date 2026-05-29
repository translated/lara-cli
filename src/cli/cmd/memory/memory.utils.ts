import Ora from 'ora';
import { LaraApiError } from '@translated/lara';

import { TranslationService } from '#modules/translation/translation.service.js';
import { LARA_WEB_URL } from '#modules/common/common.const.js';
import { handleLaraApiError } from '#utils/error.js';
import { Messages } from '#messages/messages.js';
import customSearchableSelect from '#utils/prompt.js';
import { removeIdFromConfig } from '../common/config-sync.js';
import {
  confirmOrCancel,
  maybeAddToConfig,
  resolveFilePath,
  resolveLocale,
  resolveResourceId,
  resolveText,
} from '../common/prompts.js';

function pickMemoryId(
  id: string | undefined,
  interactive: boolean,
  promptMessage: string
): Promise<string> {
  const translationService = TranslationService.getInstance();
  return resolveResourceId({
    id,
    interactive,
    fetch: () => translationService.getTranslationMemories(),
    fetchingMessage: Messages.info.fetchingMemories,
    gettingError: Messages.errors.gettingMemories,
    missingIdError: Messages.errors.memoryIdRequired,
    emptyWarning: Messages.warnings.noMemoriesLinked(LARA_WEB_URL),
    promptMessage,
  });
}

/**
 * Lists all Translation Memories available in the Lara account.
 */
export async function listMemories(): Promise<void> {
  const spinner = Ora().start(Messages.info.fetchingMemories);

  try {
    const translationService = TranslationService.getInstance();
    const memories = await translationService.getTranslationMemories();

    if (memories.length === 0) {
      spinner.warn(Messages.warnings.noMemoriesLinked(LARA_WEB_URL));
      return;
    }

    spinner.succeed(Messages.success.foundMemories(memories.length));

    for (const memory of memories) {
      console.log(Messages.ui.itemId(memory.id));
      console.log(Messages.ui.itemName(memory.name) + '\n');
    }
  } catch (error) {
    if (error instanceof LaraApiError) {
      handleLaraApiError(error, Messages.errors.gettingMemories, spinner);
      return;
    }

    throw error;
  }
}

/**
 * Creates a new Translation Memory. In interactive mode the name is prompted
 * for when not provided, and the user is asked whether to add the new id to
 * lara.yaml. In non-interactive mode the name is required and the id is added
 * to lara.yaml automatically.
 */
export async function createMemory(name: string | undefined, interactive: boolean): Promise<void> {
  const memoryName = await resolveText(
    name,
    interactive,
    Messages.prompts.enterMemoryName,
    () => Messages.errors.memoryNameRequired
  );

  const spinner = Ora({ text: Messages.info.creatingMemory, color: 'yellow' }).start();

  try {
    const translationService = TranslationService.getInstance();
    const memory = await translationService.createMemory(memoryName);

    spinner.succeed(Messages.success.memoryCreated(memory.name));
    console.log(Messages.ui.itemId(memory.id));
    console.log(Messages.ui.itemName(memory.name) + '\n');

    await maybeAddToConfig('memories', memory.id, interactive, Messages.prompts.addMemoryToConfig);
  } catch (error) {
    if (error instanceof LaraApiError) {
      handleLaraApiError(error, Messages.errors.creatingMemory, spinner);
      return;
    }

    throw error;
  }
}

/**
 * Updates the name of an existing Translation Memory. In interactive mode a
 * missing id is resolved by selecting from the list, and a missing name is
 * prompted for. In non-interactive mode both id and name are required.
 */
export async function updateMemory(
  id: string | undefined,
  name: string | undefined,
  interactive: boolean
): Promise<void> {
  const memoryId = await pickMemoryId(id, interactive, Messages.prompts.selectMemoryToUpdate);
  const memoryName = await resolveText(
    name,
    interactive,
    Messages.prompts.enterNewMemoryName,
    () => Messages.errors.memoryNameRequired
  );

  const spinner = Ora({ text: Messages.info.updatingMemory, color: 'yellow' }).start();

  try {
    const translationService = TranslationService.getInstance();
    const memory = await translationService.updateMemory(memoryId, memoryName);

    spinner.succeed(Messages.success.memoryUpdated(memory.id));
    console.log(Messages.ui.itemId(memory.id));
    console.log(Messages.ui.itemName(memory.name) + '\n');
  } catch (error) {
    if (error instanceof LaraApiError) {
      handleLaraApiError(error, Messages.errors.updatingMemory, spinner);
      return;
    }

    throw error;
  }
}

/**
 * Deletes a Translation Memory. In interactive mode the memory is picked from a
 * list and the deletion is confirmed. The id is also removed from lara.yaml.
 */
export async function deleteMemory(id: string | undefined, interactive: boolean): Promise<void> {
  const memoryId = await pickMemoryId(id, interactive, Messages.prompts.selectMemoryToDelete);

  if (interactive && !(await confirmOrCancel(Messages.prompts.confirmDeleteMemory(memoryId)))) {
    return;
  }

  const spinner = Ora({ text: Messages.info.deletingMemory, color: 'yellow' }).start();

  try {
    const translationService = TranslationService.getInstance();
    const memory = await translationService.deleteMemory(memoryId);

    spinner.succeed(Messages.success.memoryDeleted(memory.id));

    if (removeIdFromConfig('memories', memoryId)) {
      Ora({ color: 'green' }).succeed(Messages.success.removedFromConfig(memoryId));
    }
  } catch (error) {
    if (error instanceof LaraApiError) {
      handleLaraApiError(error, Messages.errors.deletingMemory, spinner);
      return;
    }

    throw error;
  }
}

/**
 * Adds a translation unit (source/target language + source/target text) to a
 * Translation Memory. Missing values are prompted for in interactive mode and
 * required in non-interactive mode.
 */
export async function addTranslation(
  id: string | undefined,
  source: string | undefined,
  target: string | undefined,
  sentence: string | undefined,
  translation: string | undefined,
  interactive: boolean
): Promise<void> {
  const memoryId = await pickMemoryId(id, interactive, Messages.prompts.selectMemoryForTranslation);
  const sourceLang = await resolveLocale(
    source,
    interactive,
    Messages.prompts.enterSourceLanguage,
    () => Messages.errors.sourceLanguageRequired
  );
  const targetLang = await resolveLocale(
    target,
    interactive,
    Messages.prompts.enterTargetLanguage,
    () => Messages.errors.targetLanguageRequired
  );
  const sourceText = await resolveText(
    sentence,
    interactive,
    Messages.prompts.enterSourceText,
    () => Messages.errors.memorySentenceRequired
  );
  const targetText = await resolveText(
    translation,
    interactive,
    Messages.prompts.enterTargetText,
    () => Messages.errors.memoryTranslationRequired
  );

  const spinner = Ora({ text: Messages.info.addingMemoryTranslation, color: 'yellow' }).start();

  try {
    const translationService = TranslationService.getInstance();
    await translationService.addMemoryTranslation(
      memoryId,
      sourceLang,
      targetLang,
      sourceText,
      targetText
    );

    spinner.succeed(Messages.success.memoryTranslationAdded);
  } catch (error) {
    if (error instanceof LaraApiError) {
      handleLaraApiError(error, Messages.errors.addingMemoryTranslation, spinner);
      return;
    }

    throw error;
  }
}

/**
 * Deletes a translation unit from a Translation Memory. The translated text is
 * optional; source/target language and source text are required.
 */
export async function deleteTranslation(
  id: string | undefined,
  source: string | undefined,
  target: string | undefined,
  sentence: string | undefined,
  translation: string | undefined,
  interactive: boolean
): Promise<void> {
  const memoryId = await pickMemoryId(id, interactive, Messages.prompts.selectMemoryForTranslation);
  const sourceLang = await resolveLocale(
    source,
    interactive,
    Messages.prompts.enterSourceLanguage,
    () => Messages.errors.sourceLanguageRequired
  );
  const targetLang = await resolveLocale(
    target,
    interactive,
    Messages.prompts.enterTargetLanguage,
    () => Messages.errors.targetLanguageRequired
  );
  const sourceText = await resolveText(
    sentence,
    interactive,
    Messages.prompts.enterSourceText,
    () => Messages.errors.memorySentenceRequired
  );
  // The API needs both the source text and its translation to identify the unit
  // to remove (the alternative, a tuid, is not exposed by the CLI).
  const targetText = await resolveText(
    translation,
    interactive,
    Messages.prompts.enterTargetText,
    () => Messages.errors.memoryTranslationRequired
  );

  if (interactive && !(await confirmOrCancel(Messages.prompts.confirmDeleteTranslation))) {
    return;
  }

  const spinner = Ora({ text: Messages.info.deletingMemoryTranslation, color: 'yellow' }).start();

  try {
    const translationService = TranslationService.getInstance();
    await translationService.deleteMemoryTranslation(
      memoryId,
      sourceLang,
      targetLang,
      sourceText,
      targetText
    );

    spinner.succeed(Messages.success.memoryTranslationDeleted);
  } catch (error) {
    if (error instanceof LaraApiError) {
      handleLaraApiError(error, Messages.errors.deletingMemoryTranslation, spinner);
      return;
    }

    throw error;
  }
}

/**
 * Imports a TMX file into a Translation Memory.
 */
export async function importTmx(
  id: string | undefined,
  file: string | undefined,
  interactive: boolean
): Promise<void> {
  const memoryId = await pickMemoryId(id, interactive, Messages.prompts.selectMemoryForTranslation);
  const filePath = await resolveFilePath(file, interactive, Messages.prompts.enterTmxPath);

  const spinner = Ora({ text: Messages.info.importingTmx(filePath), color: 'yellow' }).start();

  try {
    const translationService = TranslationService.getInstance();
    await translationService.importMemoryTmx(memoryId, filePath);

    spinner.succeed(Messages.success.tmxImported);
  } catch (error) {
    if (error instanceof LaraApiError) {
      handleLaraApiError(error, Messages.errors.importingTmx, spinner);
      return;
    }

    throw error;
  }
}

/**
 * Entry point for the bare `memory` command. In interactive mode it shows a
 * menu; in non-interactive mode it lists memories.
 */
export async function runMemoryMenu(interactive: boolean): Promise<void> {
  if (!interactive) {
    await listMemories();
    return;
  }

  const [action] = await customSearchableSelect({
    message: Messages.prompts.memoryAction,
    multiple: false,
    choices: [
      { label: Messages.ui.actionList, value: 'list' },
      { label: Messages.ui.actionCreate, value: 'create' },
      { label: Messages.ui.actionUpdate, value: 'update' },
      { label: Messages.ui.actionDelete, value: 'delete' },
      { label: Messages.ui.actionAddTranslation, value: 'add-translation' },
      { label: Messages.ui.actionDeleteTranslation, value: 'delete-translation' },
      { label: Messages.ui.actionImportTmx, value: 'import-tmx' },
    ],
  });

  switch (action) {
    case 'create':
      await createMemory(undefined, true);
      return;
    case 'update':
      await updateMemory(undefined, undefined, true);
      return;
    case 'delete':
      await deleteMemory(undefined, true);
      return;
    case 'add-translation':
      await addTranslation(undefined, undefined, undefined, undefined, undefined, true);
      return;
    case 'delete-translation':
      await deleteTranslation(undefined, undefined, undefined, undefined, undefined, true);
      return;
    case 'import-tmx':
      await importTmx(undefined, undefined, true);
      return;
    default:
      await listMemories();
  }
}
