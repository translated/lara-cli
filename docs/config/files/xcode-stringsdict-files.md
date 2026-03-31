# Xcode .stringsdict Files Configuration

This guide explains how to use Lara CLI with Xcode `.stringsdict` localization files, used for plural rules in iOS and macOS applications.

## What are .stringsdict Files?

Xcode `.stringsdict` files are XML plist files that define pluralization rules for localized strings. They are organized by locale in `.lproj` directories alongside `.strings` files and support CLDR plural categories (zero, one, two, few, many, other).

Lara CLI supports `.stringsdict` files with:

- Single-variable plural entries
- Multi-variable plural entries
- All CLDR plural categories
- Preservation of structural metadata (NSStringLocalizedFormatKey, NSStringFormatSpecTypeKey, NSStringFormatValueTypeKey)

## Configuration

To configure Xcode `.stringsdict` files in your `lara.yaml`:

```yaml
files:
  xcode-stringsdict:
    include:
      - "[locale].lproj/Localizable.stringsdict"
    exclude: []
    lockedKeys: []
    ignoredKeys: []
```

> **Note:** The configuration key is `xcode-stringsdict` (not `stringsdict`). Lara CLI automatically maps `.stringsdict` file extensions to this config key.

### File Path Patterns

```yaml
files:
  xcode-stringsdict:
    include:
      - "[locale].lproj/Localizable.stringsdict"
```

This follows the structure:

```text
MyApp/
  en.lproj/
    Localizable.stringsdict
  fr.lproj/
    Localizable.stringsdict
  es.lproj/
    Localizable.stringsdict
```

## .stringsdict File Format

### Single-Variable Plural Entry

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
</dict>
</plist>
```

### Multi-Variable Plural Entry

```xml
<key>transfer_count</key>
<dict>
    <key>NSStringLocalizedFormatKey</key>
    <string>%#@files@ in %#@folders@</string>
    <key>files</key>
    <dict>
        <key>NSStringFormatSpecTypeKey</key>
        <string>NSStringPluralRuleType</string>
        <key>NSStringFormatValueTypeKey</key>
        <string>d</string>
        <key>one</key>
        <string>%d file</string>
        <key>other</key>
        <string>%d files</string>
    </dict>
    <key>folders</key>
    <dict>
        <key>NSStringFormatSpecTypeKey</key>
        <string>NSStringPluralRuleType</string>
        <key>NSStringFormatValueTypeKey</key>
        <string>d</string>
        <key>one</key>
        <string>%d folder</string>
        <key>other</key>
        <string>%d folders</string>
    </dict>
</dict>
```

### Supported Plural Categories

- `zero` - Zero items
- `one` - One item (singular)
- `two` - Two items
- `few` - Few items
- `many` - Many items
- `other` - Other (default/fallback, required)

## How Lara CLI Handles .stringsdict Files

### Key Path Format

Lara CLI flattens plural entries into key paths:

**Single-variable entries** (one plural variable):

- `item_count/one` -> `"%d item"`
- `item_count/other` -> `"%d items"`

**Multi-variable entries** (multiple plural variables):

- `transfer_count/files/one` -> `"%d file"`
- `transfer_count/files/other` -> `"%d files"`
- `transfer_count/folders/one` -> `"%d folder"`
- `transfer_count/folders/other` -> `"%d folders"`

### Automatic Processing

Lara CLI automatically:

- Extracts plural form values for translation
- Preserves `NSStringLocalizedFormatKey` templates unchanged
- Preserves `NSStringFormatSpecTypeKey` and `NSStringFormatValueTypeKey` metadata
- Maintains entry ordering from the source file
- Preserves the plist XML structure

### Using lockedKeys and ignoredKeys

```yaml
files:
  xcode-stringsdict:
    include:
      - "[locale].lproj/Localizable.stringsdict"
    lockedKeys:
      - "item_count/one"          # Lock specific plural form
      - "item_count/*"            # Lock all forms for item_count
    ignoredKeys:
      - "debug_count/*"           # Ignore all debug plural entries
```

## Complete Example

```yaml
version: "1.0.0"

project:
  instruction: "iOS app with proper pluralization"

locales:
  source: en
  target:
    - fr
    - ar
    - ru

files:
  xcode-stringsdict:
    include:
      - "[locale].lproj/Localizable.stringsdict"
    lockedKeys: []
    ignoredKeys: []
```

## Working with Existing .stringsdict Files

1. **Run `lara-cli init`** to create your configuration
2. **Ensure your file paths match the `include` patterns**
3. **Run `lara-cli translate`** - Lara CLI will translate all plural form values
4. **Continue developing** - changes are tracked via checksums

## Limitations

- Only `NSStringPluralRuleType` format specifiers are supported
- `NSStringLocalizedFormatKey` templates are preserved but not translated (they are structural)
- Files must be organized by locale in `.lproj` directories
- Must follow standard Apple plist XML format

## Troubleshooting

### Plural Forms Not Translated

- Ensure each variable dict has `NSStringFormatSpecTypeKey` set to `NSStringPluralRuleType`
- Verify the plist XML is well-formed
- Check that plural form keys are valid CLDR categories

### Missing Entries

- Verify the entry has at least one plural variable dict
- Check that the `NSStringLocalizedFormatKey` references the variable correctly

## Related Documentation

- [Supported Formats](../formats.md) - Overview of all supported file formats
- [Files Configuration](../files.md) - General file configuration options
- [Xcode Strings Files](./xcode-strings-files.md) - Simple string localization
- [Xcode String Catalogs](./xcode-xcstrings-files.md) - Modern Xcode 15+ format
