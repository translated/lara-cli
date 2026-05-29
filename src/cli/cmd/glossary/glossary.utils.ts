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

function pickGlossaryId(
  id: string | undefined,
  interactive: boolean,
  promptMessage: string
): Promise<string> {
  const translationService = TranslationService.getInstance();
  return resolveResourceId({
    id,
    interactive,
    fetch: () => translationService.getGlossaries(),
    fetchingMessage: Messages.info.fetchingGlossaries,
    gettingError: Messages.errors.gettingGlossaries,
    missingIdError: Messages.errors.glossaryIdRequired,
    emptyWarning: Messages.warnings.noGlossariesLinked(LARA_WEB_URL),
    promptMessage,
  });
}

/**
 * Lists all Glossaries available in the Lara account.
 */
export async function listGlossaries(): Promise<void> {
  const spinner = Ora().start(Messages.info.fetchingGlossaries);

  try {
    const translationService = TranslationService.getInstance();
    const glossaries = await translationService.getGlossaries();

    if (glossaries.length === 0) {
      spinner.warn(Messages.warnings.noGlossariesLinked(LARA_WEB_URL));
      return;
    }

    spinner.succeed(Messages.success.foundGlossaries(glossaries.length));

    for (const glossary of glossaries) {
      console.log(Messages.ui.itemId(glossary.id));
      console.log(Messages.ui.itemName(glossary.name) + '\n');
    }
  } catch (error) {
    if (error instanceof LaraApiError) {
      handleLaraApiError(error, Messages.errors.gettingGlossaries, spinner);
      return;
    }

    throw error;
  }
}

/**
 * Creates a new Glossary. In interactive mode the name is prompted for when not
 * provided, and the user is asked whether to add the new id to lara.yaml. In
 * non-interactive mode the name is required and the id is added automatically.
 */
export async function createGlossary(
  name: string | undefined,
  interactive: boolean
): Promise<void> {
  const glossaryName = await resolveText(
    name,
    interactive,
    Messages.prompts.enterGlossaryName,
    () => Messages.errors.glossaryNameRequired
  );

  const spinner = Ora({ text: Messages.info.creatingGlossary, color: 'yellow' }).start();

  try {
    const translationService = TranslationService.getInstance();
    const glossary = await translationService.createGlossary(glossaryName);

    spinner.succeed(Messages.success.glossaryCreated(glossary.name));
    console.log(Messages.ui.itemId(glossary.id));
    console.log(Messages.ui.itemName(glossary.name) + '\n');

    await maybeAddToConfig(
      'glossaries',
      glossary.id,
      interactive,
      Messages.prompts.addGlossaryToConfig
    );
  } catch (error) {
    if (error instanceof LaraApiError) {
      handleLaraApiError(error, Messages.errors.creatingGlossary, spinner);
      return;
    }

    throw error;
  }
}

/**
 * Updates the name of an existing Glossary. In interactive mode a missing id is
 * resolved by selecting from the list, and a missing name is prompted for. In
 * non-interactive mode both id and name are required.
 */
export async function updateGlossary(
  id: string | undefined,
  name: string | undefined,
  interactive: boolean
): Promise<void> {
  const glossaryId = await pickGlossaryId(id, interactive, Messages.prompts.selectGlossaryToUpdate);
  const glossaryName = await resolveText(
    name,
    interactive,
    Messages.prompts.enterNewGlossaryName,
    () => Messages.errors.glossaryNameRequired
  );

  const spinner = Ora({ text: Messages.info.updatingGlossary, color: 'yellow' }).start();

  try {
    const translationService = TranslationService.getInstance();
    const glossary = await translationService.updateGlossary(glossaryId, glossaryName);

    spinner.succeed(Messages.success.glossaryUpdated(glossary.id));
    console.log(Messages.ui.itemId(glossary.id));
    console.log(Messages.ui.itemName(glossary.name) + '\n');
  } catch (error) {
    if (error instanceof LaraApiError) {
      handleLaraApiError(error, Messages.errors.updatingGlossary, spinner);
      return;
    }

    throw error;
  }
}

/**
 * Deletes a Glossary. In interactive mode the glossary is picked from a list and
 * the deletion is confirmed. The id is also removed from lara.yaml.
 */
export async function deleteGlossary(id: string | undefined, interactive: boolean): Promise<void> {
  const glossaryId = await pickGlossaryId(id, interactive, Messages.prompts.selectGlossaryToDelete);

  if (interactive && !(await confirmOrCancel(Messages.prompts.confirmDeleteGlossary(glossaryId)))) {
    return;
  }

  const spinner = Ora({ text: Messages.info.deletingGlossary, color: 'yellow' }).start();

  try {
    const translationService = TranslationService.getInstance();
    const glossary = await translationService.deleteGlossary(glossaryId);

    spinner.succeed(Messages.success.glossaryDeleted(glossary.id));

    if (removeIdFromConfig('glossaries', glossaryId)) {
      Ora({ color: 'green' }).succeed(Messages.success.removedFromConfig(glossaryId));
    }
  } catch (error) {
    if (error instanceof LaraApiError) {
      handleLaraApiError(error, Messages.errors.deletingGlossary, spinner);
      return;
    }

    throw error;
  }
}

/**
 * Adds a source→target entry to a Glossary. Missing values are prompted for in
 * interactive mode and required in non-interactive mode.
 */
export async function addEntry(
  id: string | undefined,
  sourceLang: string | undefined,
  sourceTerm: string | undefined,
  targetLang: string | undefined,
  targetTerm: string | undefined,
  interactive: boolean
): Promise<void> {
  const glossaryId = await pickGlossaryId(id, interactive, Messages.prompts.selectGlossaryForEntry);
  const sourceLanguage = await resolveLocale(
    sourceLang,
    interactive,
    Messages.prompts.enterSourceLanguage,
    () => Messages.errors.sourceLanguageRequired
  );
  const sourceValue = await resolveText(
    sourceTerm,
    interactive,
    Messages.prompts.enterGlossarySourceTerm,
    () => Messages.errors.glossarySourceTermRequired
  );
  const targetLanguage = await resolveLocale(
    targetLang,
    interactive,
    Messages.prompts.enterTargetLanguage,
    () => Messages.errors.targetLanguageRequired
  );
  const targetValue = await resolveText(
    targetTerm,
    interactive,
    Messages.prompts.enterGlossaryTargetTerm,
    () => Messages.errors.glossaryTargetTermRequired
  );

  const spinner = Ora({ text: Messages.info.addingGlossaryEntry, color: 'yellow' }).start();

  try {
    const translationService = TranslationService.getInstance();
    await translationService.addGlossaryEntry(glossaryId, [
      { language: sourceLanguage, value: sourceValue },
      { language: targetLanguage, value: targetValue },
    ]);

    spinner.succeed(Messages.success.glossaryEntryAdded);
  } catch (error) {
    if (error instanceof LaraApiError) {
      handleLaraApiError(error, Messages.errors.addingGlossaryEntry, spinner);
      return;
    }

    throw error;
  }
}

/**
 * Deletes an entry from a Glossary, identified by a term (language + value).
 */
export async function deleteEntry(
  id: string | undefined,
  language: string | undefined,
  value: string | undefined,
  interactive: boolean
): Promise<void> {
  const glossaryId = await pickGlossaryId(id, interactive, Messages.prompts.selectGlossaryForEntry);
  const termLanguage = await resolveLocale(
    language,
    interactive,
    Messages.prompts.enterTermLanguage,
    () => Messages.errors.termLanguageRequired
  );
  const termValue = await resolveText(
    value,
    interactive,
    Messages.prompts.enterTermValue,
    () => Messages.errors.termValueRequired
  );

  if (interactive && !(await confirmOrCancel(Messages.prompts.confirmDeleteEntry))) {
    return;
  }

  const spinner = Ora({ text: Messages.info.deletingGlossaryEntry, color: 'yellow' }).start();

  try {
    const translationService = TranslationService.getInstance();
    await translationService.deleteGlossaryEntry(glossaryId, {
      language: termLanguage,
      value: termValue,
    });

    spinner.succeed(Messages.success.glossaryEntryDeleted);
  } catch (error) {
    if (error instanceof LaraApiError) {
      handleLaraApiError(error, Messages.errors.deletingGlossaryEntry, spinner);
      return;
    }

    throw error;
  }
}

/**
 * Imports a CSV file into a Glossary (unidirectional source→target format).
 */
export async function importCsv(
  id: string | undefined,
  file: string | undefined,
  interactive: boolean
): Promise<void> {
  const glossaryId = await pickGlossaryId(id, interactive, Messages.prompts.selectGlossaryForEntry);
  const filePath = await resolveFilePath(file, interactive, Messages.prompts.enterCsvPath);

  const spinner = Ora({ text: Messages.info.importingCsv(filePath), color: 'yellow' }).start();

  try {
    const translationService = TranslationService.getInstance();
    await translationService.importGlossaryCsv(glossaryId, filePath);

    spinner.succeed(Messages.success.csvImported);
  } catch (error) {
    if (error instanceof LaraApiError) {
      handleLaraApiError(error, Messages.errors.importingCsv, spinner);
      return;
    }

    throw error;
  }
}

/**
 * Entry point for the bare `glossary` command. In interactive mode it shows a
 * menu; in non-interactive mode it lists glossaries.
 */
export async function runGlossaryMenu(interactive: boolean): Promise<void> {
  if (!interactive) {
    await listGlossaries();
    return;
  }

  const [action] = await customSearchableSelect({
    message: Messages.prompts.glossaryAction,
    multiple: false,
    choices: [
      { label: Messages.ui.actionList, value: 'list' },
      { label: Messages.ui.actionCreate, value: 'create' },
      { label: Messages.ui.actionUpdate, value: 'update' },
      { label: Messages.ui.actionDelete, value: 'delete' },
      { label: Messages.ui.actionAddEntry, value: 'add-entry' },
      { label: Messages.ui.actionDeleteEntry, value: 'delete-entry' },
      { label: Messages.ui.actionImportCsv, value: 'import-csv' },
    ],
  });

  switch (action) {
    case 'create':
      await createGlossary(undefined, true);
      return;
    case 'update':
      await updateGlossary(undefined, undefined, true);
      return;
    case 'delete':
      await deleteGlossary(undefined, true);
      return;
    case 'add-entry':
      await addEntry(undefined, undefined, undefined, undefined, undefined, true);
      return;
    case 'delete-entry':
      await deleteEntry(undefined, undefined, undefined, true);
      return;
    case 'import-csv':
      await importCsv(undefined, undefined, true);
      return;
    default:
      await listGlossaries();
  }
}
