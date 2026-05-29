import { ConfigProvider } from '#modules/config/config.provider.js';

/**
 * Adds a memory or glossary id to the corresponding list in lara.yaml.
 *
 * @param kind - Which config list to update ('memories' or 'glossaries')
 * @param id - The id to add
 * @returns true if the id was added, false if no config exists or the id was already present
 */
export function addIdToConfig(kind: 'memories' | 'glossaries', id: string): boolean {
  const configProvider = ConfigProvider.getInstance();

  if (!configProvider.doesConfigExists()) {
    return false;
  }

  const config = configProvider.getConfig();
  const current = config[kind] ?? [];

  if (current.includes(id)) {
    return false;
  }

  configProvider.saveConfig({
    ...config,
    [kind]: [...current, id],
  });

  return true;
}

/**
 * Removes a memory or glossary id from the corresponding list in lara.yaml.
 *
 * @param kind - Which config list to update ('memories' or 'glossaries')
 * @param id - The id to remove
 * @returns true if the id was present and removed, false if no config exists or the id was absent
 */
export function removeIdFromConfig(kind: 'memories' | 'glossaries', id: string): boolean {
  const configProvider = ConfigProvider.getInstance();

  if (!configProvider.doesConfigExists()) {
    return false;
  }

  const config = configProvider.getConfig();
  const current = config[kind] ?? [];

  if (!current.includes(id)) {
    return false;
  }

  configProvider.saveConfig({
    ...config,
    [kind]: current.filter((existingId) => existingId !== id),
  });

  return true;
}
