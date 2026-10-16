import Ora from 'ora';
import { ExitPromptError } from '@inquirer/core';

import { Messages } from '#messages/messages.js';
import { ConfigProvider } from '#modules/config/config.provider.js';
import { getErrorMessage, HandledExitError } from '#utils/error.js';
import * as metrics from '#modules/metrics/metrics.js';

/**
 * Checks whether the Lara API credentials are present in the environment.
 */
export function hasCredentials(): boolean {
  return Boolean(process.env.LARA_ACCESS_KEY_ID && process.env.LARA_ACCESS_KEY_SECRET);
}

/**
 * Exits with an error message when the Lara API credentials are missing.
 */
export function ensureCredentials(): void {
  if (!hasCredentials()) {
    Ora({ text: Messages.errors.noApiCredentials, color: 'red' }).fail();
    process.exit(1);
  }
}

/**
 * No-trace means no trace: the switch that keeps a translation out of Lara's
 * logs keeps the run out of our usage metrics too, so there is one answer to
 * "is this run recorded anywhere" instead of two. This is the project-wide half
 * of it; the per-run flag reaches us as runSafely's `noTrace` argument.
 */
function configuredNoTrace(): boolean {
  const provider = ConfigProvider.getInstance();
  if (!provider.doesConfigExists()) {
    return false;
  }
  try {
    return provider.getConfig().noTrace;
  } catch {
    // A lara.yaml we cannot read is not consent.
    return true;
  }
}

/**
 * Runs a command action, turning any uncaught error into a failed spinner and a
 * non-zero exit code. Inquirer prompt cancellations (Ctrl+C) are re-thrown so
 * the top-level handler in index.ts can exit gracefully (code 0).
 *
 * Every command in the CLI goes through here, which makes it the one place that
 * opens and closes the usage-metrics window. Keeping that pairing in a single
 * function is the point: an action with several exits cannot forget one of them.
 */
export async function runSafely(
  action: () => Promise<void>,
  command: metrics.CommandId,
  // Only translate and init own a --no-trace flag; commander rejects it as an
  // unknown option everywhere else, so the rest reach us with the default.
  noTrace = false
): Promise<void> {
  metrics.instrument(command, noTrace || configuredNoTrace());

  try {
    await action();
    await metrics.finishAndFlush(0);
  } catch (error) {
    if (error instanceof ExitPromptError) {
      throw error;
    }
    // The service records the API errors it can classify; this catches
    // everything else the command can die of.
    metrics.recordError(error);
    // A HandledExitError was already printed where it was raised.
    if (!(error instanceof HandledExitError)) {
      Ora({ text: getErrorMessage(error), color: 'red' }).fail();
    }
    await metrics.finishAndFlush(1);
    process.exit(1);
  }
}
