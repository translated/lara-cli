# Supported File Formats

Lara Dev supports multiple internationalization file formats. The appropriate parser is automatically selected based on the file extension.

## Available Formats

| Format | Extension | Description | Documentation |
|--------|-----------|-------------|---------------|
| **JSON** | `.json` | Nested or flat JSON structures commonly used in JavaScript/TypeScript applications | Built-in support |
| **PO** | `.po` | Gettext Portable Object files commonly used in PHP, Python, and other platforms | [PO Files Guide](./po-files.md) |

## How It Works

The file format is automatically detected based on the file extension:

- Files ending with `.json` are parsed as JSON
- Files ending with `.po` are parsed as PO (gettext) files

You can configure multiple formats simultaneously in the same project by adding different format sections under the `files` configuration.

## Configuration Example

```yaml
files:
  json:
    include:
      - "src/i18n/[locale].json"
  po:
    include:
      - "locales/[locale]/LC_MESSAGES/messages.po"
```

## Format-Specific Documentation

For detailed information about a specific format, see its dedicated documentation:

- [PO Files Guide](./po-files.md) - Complete guide for gettext PO files

