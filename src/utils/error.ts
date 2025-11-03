import { LaraApiError } from '@translated/lara';
import { Ora } from 'ora';
import { Messages } from '#messages/messages.js';

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
