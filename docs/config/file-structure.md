# File Structure

This document describes the file structure supported by Lara Dev.

## Supported File Format

Lara Dev supports only **`.json`** files.

## Supported Structure

Lara Dev follows the standard **i18n structure**, where translation files are organized by locale.

## Structure Examples

### Single file per locale

```
project/
  src/
    i18n/
      en.json
      es.json
      fr.json
      de.json
```

### Directory per locale

```
project/
  locales/              (or i18n/, translations/, etc.)
    en/                 (generic English)
      translation.json
    en-US/              (American English)
      translation.json
    it/                 (generic Italian)
      translation.json
    it-IT/              (Italian - Italy)
      translation.json
    fr/
      translation.json
    es/
      translation.json
```

Each JSON file contains your translations in a nested key-value structure:

```json
{
  "common": {
    "buttons": {
      "submit": "Submit",
      "cancel": "Cancel"
    }
  },
  "dashboard": {
    "title": "Dashboard",
    "welcome": "Welcome back"
  }
}
```

## Multiple Files Per Locale

Lara Dev supports multiple translation files per locale, allowing you to organize your translations by feature, module, or domain.

### Example: Multiple Files

```
project/
  locales/
    en/
      common.json          (shared translations)
      dashboard.json       (dashboard-specific)
      settings.json        (settings-specific)
      errors.json          (error messages)
    es/
      common.json
      dashboard.json
      settings.json
      errors.json
    it/
      common.json
      dashboard.json
      settings.json
      errors.json
```

## Limitations and Best Practices

### What is NOT Supported

**Other file formats**: Only `.json` files are supported. Formats like YAML, XML, PO, or properties files are not supported.

**Locale with suffixes or prefixes**: The locale code must be the exact filename (without extension) or directory name, without additional text.
```
# NOT SUPPORTED
en.default.json
es_default.json
default.en.json
common-en.json

# SUPPORTED
en.json
es.json
en/default.json
es/common.json
```

**Underscore format for region codes**: Use hyphens for region-specific locales.
```
# NOT SUPPORTED
en_US.json

# SUPPORTED
en-US.json
```

### Automatically Excluded Directories

The following directories are automatically excluded from file discovery:

- `node_modules/`
- `dist/`
- `build/`
- `bin/`
- `out/`
- `spec/`
- `test/`
- `tests/`

You don't need to manually exclude these in your configuration.

### Best Practices

**Use consistent naming**: Choose one pattern and stick to it across your project.

**Avoid special characters**: Use only alphanumeric characters, es: en.json, translation.jsonr

**Use relative paths**: Configure paths relative to your project root.

**One locale identifier per path**: Ensure each file path contains the locale identifier exactly once.

**Valid JSON**: All files must contain valid, parseable JSON. Empty files or malformed JSON will cause errors.

**Consistent structure**: Keep the same JSON key structure across all locale files.

### Common Mistakes to Avoid

**Mixing file and directory patterns**:
```yaml
# Avoid mixing these patterns without clear organization
include:
  - "locales/[locale].json"        # File-based
  - "locales/[locale]/app.json"    # Directory-based
```

**Forgetting the [locale] placeholder**:
```yaml
# This will not work
include:
  - "locales/translations.json"    # Missing [locale]
```

**Using unsupported locale codes**: Only ISO 639-1, ISO 639-3, and BCP-47 locale codes are supported. Custom or non-standard codes will not be recognized.
[See all supported locales.](/docs/config/locales.md)
