import { input } from '@inquirer/prompts';
import Ora from 'ora';
import { existsSync, readFileSync, writeFileSync } from 'fs';

import { ConfigProvider } from '#modules/config/config.provider.js';

/**
 * Resolves the project context based on CLI option or existing config.
 * Priority: CLI context > Existing context > undefined
 * 
 * @param cliContext - Context provided via CLI option
 * @returns Resolved context or undefined
 */
export function resolveProjectContext(cliContext?: string): string | undefined {
  // If context provided via CLI, use it
  if (cliContext) {
    return cliContext;
  }

  // Otherwise, try to preserve existing context from config
  const configProvider = ConfigProvider.getInstance();
  if (configProvider.doesConfigExists()) {
    const config = configProvider.getConfig();
    return config.project?.context;
  }

  return undefined;
}

/**
 * Retrieves existing context from config if available.
 * Returns undefined if config doesn't exist, force flag is set, or error occurs.
 * 
 * @param force - If true, ignores existing context
 * @returns Existing context or undefined
 */
export function getExistingContext(force: boolean): string | undefined {
  const configProvider = ConfigProvider.getInstance();
  
  if (!configProvider.doesConfigExists() || force) {
    return undefined;
  }

  try {
    const config = configProvider.getConfig();
    return config.project?.context;
  } catch {
    return undefined;
  }
}

/**
 * Validates and sanitizes API credentials.
 * Only allows non-empty strings with alphanumeric characters, dashes, and underscores.
 * Trims whitespace and removes newlines.
 * 
 * @param credential - The credential string to validate
 * @param name - The name of the credential (for error messages)
 * @returns Sanitized credential string
 * @throws Error if credential is invalid
 */
function validateCredential(credential: string, name: string): string {
  const sanitized = credential.trim().replace(/[\r\n]+/g, '');
  // Accept alphanumeric, dash, underscore, min 8 chars, max 128 chars
  if (!/^[A-Za-z0-9\-_]{8,128}$/.test(sanitized)) {
    throw new Error(
      `${name} must be 8-128 characters and contain only letters, numbers, dashes, or underscores.`
    );
  }
  return sanitized;
}

/**
 * Resets API credentials by prompting for new values and updating .env file.
 * Preserves other environment variables in the file.
 * 
 * @returns Promise that resolves when credentials are updated
 */
export async function resetCredentials(): Promise<void> {
  const apiKeyRaw = await input({ message: 'Insert your New API Key:' });
  const apiSecretRaw = await input({ message: 'Insert your New API Secret:' });
  let apiKey: string, apiSecret: string;
  try {
    apiKey = validateCredential(apiKeyRaw, 'API Key');
    apiSecret = validateCredential(apiSecretRaw, 'API Secret');
  } catch (err: any) {
    Ora({ text: err.message, color: 'red' }).fail();
    throw err;
  }

  const envPath = '.env';

  if (!existsSync(envPath)) {
    Ora({ text: 'No .env file found. Creating one...', color: 'yellow' }).warn();
    writeFileSync(envPath, '');
  }

  let envContent = '';
  try {
    envContent = readFileSync(envPath, 'utf-8');
  } catch (err) {
    Ora({ text: `Failed to read .env file: ${err.message}. Please check file permissions.`, color: 'red' }).fail();
    throw err;
  }

  // Replace or add the key/value pairs
  if (/^LARA_ACCESS_KEY_ID=/m.test(envContent)) {
    envContent = envContent.replace(/^LARA_ACCESS_KEY_ID=.*$/m, `LARA_ACCESS_KEY_ID=${apiKey}`);
  } else {
    envContent += `\n# Lara API credentials\nLARA_ACCESS_KEY_ID=${apiKey}`;
  }

  if (/^LARA_ACCESS_KEY_SECRET=/m.test(envContent)) {
    envContent = envContent.replace(/^LARA_ACCESS_KEY_SECRET=.*$/m, `LARA_ACCESS_KEY_SECRET=${apiSecret}`);
  } else {
    envContent += `\nLARA_ACCESS_KEY_SECRET=${apiSecret}`;
  }

  writeFileSync(envPath, envContent);

  Ora({ text: 'API credentials reset successfully', color: 'green' }).succeed();
}

