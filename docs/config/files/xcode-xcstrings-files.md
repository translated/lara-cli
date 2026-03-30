# Xcode String Catalogs (.xcstrings) Configuration

This guide explains how to use Lara CLI with Xcode String Catalogs (`.xcstrings`), the modern localization format introduced in Xcode 15.

## What are .xcstrings Files?

Xcode String Catalogs are JSON-based files that store **all locales in a single file**. They replace the traditional `.strings` + `.stringsdict` workflow with a unified format managed by Xcode's String Catalog editor.

Unlike `.strings` and `.stringsdict` files (which use one file per locale), `.xcstrings` files contain translations for all languages in one place.

Lara CLI supports `.xcstrings` files with:

- Simple string translations
- Plural variations (zero, one, two, few, many, other)
- Non-translatable entries (`shouldTranslate: false`)
- Metadata preservation (extractionState, comments)

## Configuration

To configure Xcode String Catalogs in your `lara.yaml`:

```yaml
files:
  xcode-xcstrings:
    include:
      - "Localizable.xcstrings"
    exclude: []
    lockedKeys: []
    ignoredKeys: []
```

> **Note:** The configuration key is `xcode-xcstrings`. Since all locales are stored in one file, the path does **not** contain a `[locale]` placeholder.

### File Path Patterns

```yaml
files:
  xcode-xcstrings:
    include:
      - "Localizable.xcstrings"
      - "Sources/InfoPlist.xcstrings"
```

Since `.xcstrings` files contain all locales, there is only one file per catalog:

```text
MyApp/
  Localizable.xcstrings      (contains en, fr, es, de, etc.)
  InfoPlist.xcstrings         (contains en, fr, es, de, etc.)
```

## .xcstrings File Format

### Simple Strings

```json
{
  "sourceLanguage": "en",
  "version": "1.0",
  "strings": {
    "app_name": {
      "localizations": {
        "en": {
          "stringUnit": {
            "state": "translated",
            "value": "My App"
          }
        },
        "fr": {
          "stringUnit": {
            "state": "translated",
            "value": "Mon Application"
          }
        }
      }
    }
  }
}
```

### Plural Variations

```json
{
  "item_count": {
    "localizations": {
      "en": {
        "variations": {
          "plural": {
            "one": {
              "stringUnit": {
                "state": "translated",
                "value": "%lld item"
              }
            },
            "other": {
              "stringUnit": {
                "state": "translated",
                "value": "%lld items"
              }
            }
          }
        }
      }
    }
  }
}
```

### Non-Translatable Entries

```json
{
  "CFBundleName": {
    "shouldTranslate": false,
    "localizations": {
      "en": {
        "stringUnit": {
          "state": "translated",
          "value": "MyApp"
        }
      }
    }
  }
}
```

Entries with `"shouldTranslate": false` are preserved but not sent for translation.

## How Lara CLI Handles .xcstrings Files

### Key Path Format

Lara CLI flattens `.xcstrings` entries into key paths:

**Simple strings:**

- `"app_name"` -> `"My App"`
- `"hello"` -> `"Hello World"`

**Plural variations:**

- `"item_count/one"` -> `"%lld item"`
- `"item_count/other"` -> `"%lld items"`

### Automatic Processing

Lara CLI automatically:

- Reads all locales from the single file
- Translates entries for each target locale independently
- Sets the `state` field to `"translated"` for new translations
- Preserves `sourceLanguage`, `version`, and other metadata
- Preserves `shouldTranslate: false` entries unchanged
- Preserves `extractionState` and `comment` metadata
- Maintains JSON formatting (indentation)
- Preserves existing translations for locales not being updated

### Using lockedKeys and ignoredKeys

```yaml
files:
  xcode-xcstrings:
    include:
      - "Localizable.xcstrings"
    lockedKeys:
      - "app_name"              # Lock specific key
      - "item_count/one"        # Lock specific plural form
    ignoredKeys:
      - "debug_*"               # Ignore all debug keys
```

## Complete Example

```yaml
version: "1.0.0"

project:
  instruction: "iOS app, professional tone"

locales:
  source: en
  target:
    - fr
    - de
    - ja

files:
  xcode-xcstrings:
    include:
      - "Localizable.xcstrings"
      - "InfoPlist.xcstrings"
    lockedKeys:
      - "CFBundleName"
    ignoredKeys: []
    fileInstructions:
      - path: "Localizable.xcstrings"
        instruction: "User-facing messages"
```

## Working with Existing .xcstrings Files

1. **Run `lara-cli init`** to create your configuration
2. **Ensure your file paths match the `include` patterns**
3. **Run `lara-cli translate`**
4. **Continue developing** - Lara CLI tracks changes to the source language entries

If starting fresh:

1. **Create your `.xcstrings` file** with source language entries
2. **Run `lara-cli translate`** - target locale entries are added to the same file

## Limitations

- Device variations (`variations.device`) are not currently supported
- Substitutions are not currently supported
- The `shouldTranslate: false` flag must be set at the string entry level
- Files must follow the standard `.xcstrings` JSON format

## Troubleshooting

### Translations Not Appearing

- Verify the source language entries exist in the `localizations` object
- Check that `sourceLanguage` matches your configured source locale
- Ensure entries don't have `shouldTranslate: false`

### Existing Translations Overwritten

- Lara CLI only updates entries that have changed in the source language
- Use `ignoredKeys` to prevent specific entries from being re-translated
- Unchanged source entries keep their existing translations

### JSON Formatting Changed

- Lara CLI detects and preserves the original indentation
- If formatting differs, verify Xcode hasn't reformatted the file

## Related Documentation

- [Supported Formats](../formats.md) - Overview of all supported file formats
- [Files Configuration](../files.md) - General file configuration options
- [Xcode Strings Files](./xcode-strings-files.md) - Traditional .strings format
- [Xcode Stringsdict Files](./xcode-stringsdict-files.md) - Traditional plural format
