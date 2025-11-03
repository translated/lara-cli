---
title: Translate Command
sidebar_position: 2
---

# Translate Command

The `translate` command processes internationalization files specified in your `lara.yaml` configuration and translates them from the source locale to the target locales.

## Usage

```bash
lara-dev translate [options]
```

## Options

| Option | Description |
|--------|-------------|
| `-t, --target <locales>` | Comma-separated list of target locales to translate to |
| `-f, --force` | Force retranslation of all content, even if unchanged |
| `-h, --help` | Display help information |

## Examples

### Translate All Configured Locales

```bash
lara-dev translate
```

Translates content to all target locales specified in your `lara.yaml` configuration file.

### Translate Specific Locales

```bash
lara-dev translate --target "es, fr"
```

### Force Retranslation of All Content

```bash
lara-dev translate --force
```

### Force Translation of a Specific Locale

```bash
lara-dev translate --target "es" --force
```

## Prerequisites

Before using the translate command:

1. Initialize your project with `lara-dev init`
2. Configure API credentials in a `.env` file:
   ```
   LARA_ACCESS_KEY_ID=your_access_key_id
   LARA_ACCESS_KEY_SECRET=your_access_key_secret
   ```
3. Create source locale files with content to translate

## Change Detection

Lara Dev uses checksums to determine what content needs translation:

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
