# Translate Command

The `translate` command processes internationalization files specified in your `lara.yaml` configuration and translates them from the source locale to the target locales.

## Usage

```bash
lara-cli translate [options]
```

## Options

| Option | Description |
|--------|-------------|
| `-t, --target <locales>` | Comma-separated list of target locales to translate to |
| `-p, --paths <paths>` | Comma-separated list of specific file paths to translate (overrides config) |
| `-f, --force` | Force retranslation of all content, even if unchanged |
| `-h, --help` | Display help information |

## Examples

### Translate All Configured Locales

```bash
lara-cli translate
```

Translates content to all target locales specified in your `lara.yaml` configuration file.

### Translate Specific Locales

```bash
lara-cli translate --target "es, fr"
```

### Force Retranslation of All Content

```bash
lara-cli translate --force
```

### Force Translation of a Specific Locale

```bash
lara-cli translate --target "es" --force
```

### Translate Specific Files

```bash
lara-cli translate --paths "src/i18n/[locale]/common.json"
```

### Translate Multiple Specific Files

```bash
lara-cli translate --paths "src/i18n/[locale]/common.json, src/i18n/[locale]/errors.json"
```

### Combine Specific Files and Locales

```bash
lara-cli translate --paths "src/i18n/[locale]/common.json" --target "es, fr"
```

## Prerequisites

Before using the translate command:

1. Initialize your project with `lara-cli init`
2. Configure API credentials in a `.env` file:

   ```
   LARA_ACCESS_KEY_ID=your_access_key_id
   LARA_ACCESS_KEY_SECRET=your_access_key_secret
   ```

3. Create source locale files with content to translate

## Specifying Files to Translate

You can control which files are translated in two ways:

### 1. Configuration File (Default)

By default, the `translate` command processes all files defined in your `lara.yaml` configuration file:

```yaml
files:
  json:
    include:
      - "src/i18n/[locale]/common.json"
      - "src/i18n/[locale]/pages.json"
      - "src/i18n/[locale]/errors.json"
```

### 2. Command-Line Override

Use the `--paths` option to translate specific files, overriding the configuration file:

```bash
lara-cli translate --paths "src/i18n/[locale]/common.json"
```

**Important**: Paths must include the `[locale]` placeholder, just like in the configuration file.

**Benefits**:

- Translate only the files you're currently working on
- Faster iteration during development
- Reduced API costs by translating only what's needed

## Change Detection

Lara CLI uses checksums to determine what content needs translation:

- **First run**: All content is translated
- **Subsequent runs**: Only changed or new keys are translated
- **Force mode** (`--force`): Retranslates all content, ignoring checksums

When you modify source locale files, the tool automatically detects changes and translates only the updated content. This saves time and API costs by avoiding unnecessary retranslations.

### When to Use Force Mode

Use `--force` when you need to:

- Retranslate content after updating instructions
- Apply new Translation Memories or Glossaries to existing content
- Fix translation errors by regenerating all translations
- Reset translations after configuration changes

## Related

- [Configuration Reference](../config/README.md) - Detailed configuration options
