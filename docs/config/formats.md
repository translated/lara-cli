# Supported File Formats

Lara Dev supports multiple internationalization file formats. The appropriate parser is automatically selected based on the file extension.

## Available Formats

| Format           | Extension     | Description                                                                        | Documentation                               |
| ---------------- | ------------- | ---------------------------------------------------------------------------------- | ------------------------------------------- |
| **JSON**         | `.json`       | Nested or flat JSON structures commonly used in JavaScript/TypeScript applications | Built-in support                            |
| **PO**           | `.po`         | Gettext Portable Object files commonly used in PHP, Python, and other platforms    | [PO Files Guide](./files/po-files.md)       |
| **TS**           | `.ts`         | TypeScript files commonly used in Vue.js applications                              | [TS Files Guide](./files/ts-files.md)       |
| **Vue**          | `.vue`        | Vue I18n single-file components                                                    | [Vue Files Guide](./files/vue-files.md)     |
| **Markdown/MDX** | `.md`, `.mdx` | Markdown and MDX files for documentation, blogs, and content sites                 | [Markdown Files Guide](./files/md-files.md) |

## How It Works

The file format is automatically detected based on the file extension:

- Files ending with `.json` are parsed as JSON
- Files ending with `.po` are parsed as PO (gettext) files
- Files ending with `.ts` are parsed as TypeScript files
- Files ending with `.vue` are parsed as Vue.js I18n single-file components
- Files ending with `.md` or `.mdx` are parsed as Markdown/MDX files

You can configure multiple formats simultaneously in the same project by adding different format sections under the `files` configuration.

## Configuration Example

```yaml
files:
  json:
    include:
      - 'src/i18n/[locale].json'
  po:
    include:
      - 'locales/[locale]/LC_MESSAGES/messages.po'
  ts:
    include:
      - 'src/i18n.ts'
  md:
    include:
      - 'docs/[locale]/*.md'
```

## Format-Specific Documentation

For detailed information about a specific format, see its dedicated documentation:

- [PO Files Guide](./files/po-files.md) - Complete guide for gettext PO files
- [TS Files Guide](./files/ts-files.md) - Complete guide for TypeScript files
- [Vue Files Guide](./files/vue-files.md) - Complete guide for Vue I18n single-file components
- [Markdown Files Guide](./files/md-files.md) - Complete guide for Markdown and MDX files
