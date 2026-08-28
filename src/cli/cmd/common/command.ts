import Ora from 'ora';
import { ExitPromptError } from '@inquirer/core';

import { Messages } from '#messages/messages.js';
import { reportUnlessHandled } from '#utils/error.js';
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
  kind: metrics.CommandKind = 'auth-only'
): Promise<void> {
  metrics.instrument(kind);

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
    reportUnlessHandled(error);
    await metrics.finishAndFlush(1);
    process.exit(1);
  }
}
