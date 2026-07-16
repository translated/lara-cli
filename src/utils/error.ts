import { LaraApiError } from '@translated/lara';
import { Ora } from 'ora';
import { Messages } from '#messages/messages.js';

/** Narrows an unknown caught value to a readable message string. */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * True when an error is the Lara "plan out of characters / quota exceeded" error.
 * Matched on the message/type because the API does not use a dedicated status
 * code for it (it arrives as a normal API error whose message mentions "quota").
 */
export function isQuotaError(error: unknown): boolean {
  const type = error instanceof LaraApiError ? error.type : '';
  return /\bquota\b/i.test(`${getErrorMessage(error)} ${type}`);
}

/**
 * Handles Lara API errors by displaying appropriate error messages and exiting the process.
 * Uses early returns (guard clauses) for optimal performance and readability.
 *
 * @param error - The LaraApiError to handle
 * @param context - Context information (e.g., file path being translated)
 * @returns Never returns - always exits the process
 */
export function handleLaraApiError(error: LaraApiError, context: string, spinner: Ora): void {
  // Authentication error - early return
  if (error.statusCode === 401) {
    displayErrorAndExit(Messages.errors.apiAuthFailed(context), spinner);
  }

  // Plan exhausted (no characters left) / forbidden - early return
  if (error.statusCode === 402 || error.statusCode === 403 || isQuotaError(error)) {
    displayErrorAndExit(Messages.errors.apiQuotaExceeded(context, error.message || ''), spinner);
  }

  // Server error - early return
  if (error.statusCode >= 500) {
    displayErrorAndExit(Messages.errors.serviceUnavailable(context, error.statusCode), spinner);
  }

  // Default error handling - all other cases
  displayError(Messages.errors.translationFailed(context, error.message || ''), spinner);
}

/**
 * Displays an error message using Ora and exits the process.
 *
 * @param message - The error message to display
 * @returns Never returns - always exits the process
 */
function displayErrorAndExit(message: string, spinner: Ora): never {
  spinner.fail(message);
  process.exit(1);
}

function displayError(message: string, spinner: Ora): void {
  spinner.fail(message);
}
