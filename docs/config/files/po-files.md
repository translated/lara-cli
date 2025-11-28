# PO Files Configuration

This guide explains how to use Lara Dev with PO (Portable Object) files, the standard gettext format used in PHP, Python, and many other platforms.

## What are PO Files?

PO files are part of the GNU gettext internationalization system. They store translatable strings in a structured text format and are widely used in web applications, particularly those built with:

- PHP (Laravel, Symfony, WordPress)
- Python (Django, Flask)
- Ruby on Rails
- C/C++ applications
- Many other platforms

## Configuration

To configure PO files in your `lara.yaml`:

```yaml
files:
  po:
    include:
      - "locales/[locale]/LC_MESSAGES/messages.po"
    exclude: []
    lockedKeys: []
    ignoredKeys: []
```

### Common Directory Structures

#### Standard Gettext Structure

```yaml
files:
  po:
    include:
      - "locales/[locale]/LC_MESSAGES/messages.po"
      - "locales/[locale]/LC_MESSAGES/errors.po"
```

This follows the traditional gettext structure:
```
locales/
  ├── en/
  │   └── LC_MESSAGES/
  │       ├── messages.po
  │       └── errors.po
  ├── es/
  │   └── LC_MESSAGES/
  │       ├── messages.po
  │       └── errors.po
```

#### Simple Structure

```yaml
files:
  po:
    include:
      - "i18n/[locale].po"
      - "translations/[locale]/app.po"
```

This uses a simpler directory structure:
```
i18n/
  ├── en.po
  ├── es.po
  └── fr.po
```

## PO File Features

### Message IDs (msgid)

The basic translation unit in PO files:

```
msgid "Hello, world!"
msgstr "Hola, mundo!"
```

### Contexts (msgctxt)

Use contexts to differentiate identical strings with different meanings:

```
msgctxt "navigation"
msgid "Home"
msgstr "Inicio"

msgctxt "housing"
msgid "Home"
msgstr "Casa"
```

### Plural Forms (msgid_plural)

Handle singular and plural translations:

```
msgid "item"
msgid_plural "items"
msgstr[0] "campo"
msgstr[1] "campi"
```

## How Lara Dev Handles PO Files

### Automatic Processing

Lara Dev automatically:

- ✅ Preserves message order from the original file
- ✅ Maintains all metadata and headers
- ✅ Handles contexts and plural forms correctly
- ✅ Updates `PO-Revision-Date` automatically
- ✅ Sets `X-Generator` to "Lara-Dev"

### Header Management

PO file headers are preserved and updated:

```
msgid ""
msgstr ""
"Language: es\n"
"PO-Revision-Date: 2024-01-15 10:30:00+0000\n"
"X-Generator: Lara-Dev\n"
```

### Locked and Ignored Keys

When using `lockedKeys` or `ignoredKeys` with PO files, the patterns match against the `msgid`:

```yaml
files:
  po:
    include:
      - "locales/[locale]/LC_MESSAGES/messages.po"
    lockedKeys:
      - "USER_ID"
      - "API_*"
    ignoredKeys:
      - "DEBUG_*"
```

## Complete Example

Here's a complete configuration example for a PHP Laravel project:

```yaml
version: "1.0.0"

project:
  instruction: "E-commerce application, use formal tone"

locales:
  source: en
  target:
    - es
    - fr
    - de
    - it

memories:
  - mem_abc123

glossaries:
  - gls_xyz789

files:
  po:
    include:
      - "lang/[locale]/messages.po"
      - "lang/[locale]/validation.po"
    exclude:
      - "lang/[locale]/test-*.po"
    lockedKeys:
      - "API_*"
      - "SYSTEM_*"
    ignoredKeys:
      - "DEBUG_*"
      - "TEMP_*"
    fileInstructions:
      - path: "lang/[locale]/validation.po"
        instruction: "Validation messages, keep concise and clear"
```

## Working with Existing PO Files

If you already have PO files with translations:

1. **Run `lara-dev init`** to create your configuration
2. **Run `lara-dev translate`** for the first time - only missing or changed translations will be processed
3. **Continue developing** - Lara Dev tracks changes via checksums and only translates what's new or modified

## Best Practices

### 1. Keep Source Files Clean

Ensure your source locale PO files are well-formatted and contain the original text you want to translate.

### 2. Use Contexts Wisely

Use `msgctxt` to differentiate strings that have the same text but different meanings:

```
msgctxt "button"
msgid "Save"
msgstr ""

msgctxt "financial"
msgid "Save"
msgstr ""
```

### 3. Leverage Instructions

Use file-level or key-level instructions for better translation quality:

```yaml
files:
  po:
    include:
      - "lang/[locale]/messages.po"
    fileInstructions:
      - path: "lang/[locale]/messages.po"
        instruction: "Customer-facing messages, friendly tone"
```

### 4. Lock Placeholders and Constants

Prevent translation of constants and placeholders:

```yaml
files:
  po:
    lockedKeys:
      - "APP_NAME"
      - "VERSION_*"
      - "URL_*"
```

## Troubleshooting

### Message Order Changes

Lara Dev preserves the original message order. If you notice changes, ensure your source PO file is properly formatted.

### Plural Forms

Lara Dev handles plural forms automatically. Ensure your source file correctly defines plural forms for proper translation.

### Character Encoding

PO files should use UTF-8 encoding. Lara Dev respects the charset specified in the PO file headers.

## Related Documentation

- [Supported Formats](./formats.md) - Overview of all supported file formats
- [Files Configuration](./files.md) - General file configuration options
- [Instructions](./instructions.md) - How to use translation instructions

