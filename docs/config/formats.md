# Supported File Formats

Lara CLI supports multiple internationalization file formats. The appropriate parser is automatically selected based on the file extension.

## Available Formats

| Format           | Extension     | Description                                                                        | Documentation                                    |
| ---------------- | ------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------ |
| **JSON**         | `.json`       | Nested or flat JSON structures commonly used in JavaScript/TypeScript applications | Built-in support                                 |
| **PO**           | `.po`         | Gettext Portable Object files commonly used in PHP, Python, and other platforms    | [PO Files Guide](./files/po-files.md)            |
| **TS**           | `.ts`         | TypeScript files commonly used in Vue.js applications                              | [TS Files Guide](./files/ts-files.md)            |
| **Vue**          | `.vue`        | Vue I18n single-file components                                                    | [Vue Files Guide](./files/vue-files.md)          |
| **Markdown/MDX** | `.md`, `.mdx` | Markdown and MDX files for documentation, blogs, and content sites                 | [Markdown Files Guide](./files/md-files.md)      |
| **Android XML**  | `.xml`        | Android string resource files commonly used in Android applications                | [Android XML Files Guide](./files/android-xml-files.md) |
| **Xcode Strings** | `.strings`   | Xcode .strings key-value localization files for iOS/macOS applications             | [Xcode Strings Files Guide](./files/xcode-strings-files.md) |
| **Xcode Stringsdict** | `.stringsdict` | Xcode .stringsdict plist files with plural rules for iOS/macOS applications    | [Xcode Stringsdict Files Guide](./files/xcode-stringsdict-files.md) |
| **Xcode String Catalogs** | `.xcstrings` | Xcode String Catalogs (Xcode 15+), all locales in a single JSON file       | [Xcode String Catalogs Guide](./files/xcode-xcstrings-files.md) |

## How It Works

The file format is automatically detected based on the file extension:

- Files ending with `.json` are parsed as JSON
- Files ending with `.po` are parsed as PO (gettext) files
- Files ending with `.ts` are parsed as TypeScript files
- Files ending with `.vue` are parsed as Vue.js I18n single-file components
- Files ending with `.md` or `.mdx` are parsed as Markdown/MDX files
- Files ending with `.xml` are parsed as Android XML string resource files
- Files ending with `.strings` are parsed as Xcode .strings localization files
- Files ending with `.stringsdict` are parsed as Xcode .stringsdict plural files
- Files ending with `.xcstrings` are parsed as Xcode String Catalogs (all locales in one file)

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
  xml:
    include:
      - 'res/[locale]/strings.xml'
  xcode-strings:
    include:
      - '[locale].lproj/Localizable.strings'
  xcode-stringsdict:
    include:
      - '[locale].lproj/Localizable.stringsdict'
  xcode-xcstrings:
    include:
      - 'Localizable.xcstrings'
```

## Format-Specific Documentation

For detailed information about a specific format, see its dedicated documentation:

- [PO Files Guide](./files/po-files.md) - Complete guide for gettext PO files
- [TS Files Guide](./files/ts-files.md) - Complete guide for TypeScript files
- [Vue Files Guide](./files/vue-files.md) - Complete guide for Vue I18n single-file components
- [Markdown Files Guide](./files/md-files.md) - Complete guide for Markdown and MDX files
- [Android XML Files Guide](./files/android-xml-files.md) - Complete guide for Android XML string resource files
- [Xcode Strings Files Guide](./files/xcode-strings-files.md) - Complete guide for Xcode .strings files
- [Xcode Stringsdict Files Guide](./files/xcode-stringsdict-files.md) - Complete guide for Xcode .stringsdict plural files
- [Xcode String Catalogs Guide](./files/xcode-xcstrings-files.md) - Complete guide for Xcode .xcstrings String Catalogs
