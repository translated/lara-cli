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
