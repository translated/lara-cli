# Xcode .strings Files Configuration

This guide explains how to use Lara CLI with Xcode `.strings` localization files, commonly used in iOS and macOS applications.

## What are .strings Files?

Xcode `.strings` files are the traditional format for storing localized strings in Apple applications. They use a simple key-value pair format organized by locale in `.lproj` directories (e.g., `en.lproj/Localizable.strings`, `fr.lproj/Localizable.strings`).

Lara CLI supports `.strings` files with:

- Simple key-value string pairs
- C-style comments (`/* ... */`)
- Escape sequences (`\"`, `\\`, `\n`, `\t`, `\U` unicode)

## Configuration

To configure Xcode `.strings` files in your `lara.yaml`:

```yaml
files:
  xcode-strings:
    include:
      - "[locale].lproj/Localizable.strings"
    exclude: []
    lockedKeys: []
    ignoredKeys: []
```

> **Note:** The configuration key is `xcode-strings` (not `strings`). Lara CLI automatically maps `.strings` file extensions to this config key.
>
> **Important:** Lara CLI uses `[locale].lproj/Localizable.strings` structure (e.g., `en.lproj/Localizable.strings`, `fr.lproj/Localizable.strings`). The `[locale]` placeholder is replaced with the locale code.

### File Path Patterns

#### Standard Structure (Recommended)

```yaml
files:
  xcode-strings:
    include:
      - "[locale].lproj/Localizable.strings"
      - "[locale].lproj/InfoPlist.strings"
```

This follows the structure:

```text
MyApp/
  en.lproj/
    Localizable.strings
    InfoPlist.strings
  fr.lproj/
    Localizable.strings
    InfoPlist.strings
  es.lproj/
    Localizable.strings
    InfoPlist.strings
```

#### Custom Structure

```yaml
files:
  xcode-strings:
    include:
      - "Resources/[locale].lproj/Localizable.strings"
```

## .strings File Format

### Basic Format

```
/* App Name */
"app_name" = "My App";

/* Greeting message */
"hello" = "Hello World";

/* Button labels */
"button_submit" = "Submit";
"button_cancel" = "Cancel";
```

Each entry follows the format: `"key" = "value";`

### Comments

C-style block comments and single-line comments are supported and preserved during translation:

```
/* Section: Login Screen */
"login_title" = "Welcome Back";

// Username field placeholder
"login_username" = "Enter your username";
```

### Escape Sequences

```
"escaped_quotes" = "Say \"Hello\"";
"newline" = "Line 1\nLine 2";
"tab" = "Column 1\tColumn 2";
"backslash" = "C:\\Users\\file";
"unicode" = "\U00E9";
```

### Empty Values

```
"empty_key" = "";
```

## How Lara CLI Handles .strings Files

### Automatic Processing

Lara CLI automatically:

- Extracts key-value pairs from `.strings` files
- Preserves comments and their association with keys
- Maintains key ordering from the source file
- Handles escape sequences correctly
- Preserves file formatting

### Key Path Format

When using `lockedKeys` or `ignoredKeys`, use the key name directly:

```yaml
files:
  xcode-strings:
    include:
      - "[locale].lproj/Localizable.strings"
    lockedKeys:
      - "app_name"          # Exact key
      - "api_*"             # Wildcard pattern
    ignoredKeys:
      - "debug_*"           # Ignore all debug keys
```

## Complete Example

```yaml
version: "1.0.0"

project:
  instruction: "iOS app, user-friendly tone"

locales:
  source: en
  target:
    - es
    - fr
    - de

files:
  xcode-strings:
    include:
      - "[locale].lproj/Localizable.strings"
      - "[locale].lproj/InfoPlist.strings"
    exclude: []
    lockedKeys:
      - "app_name"
    ignoredKeys:
      - "debug_*"
    fileInstructions:
      - path: "[locale].lproj/Localizable.strings"
        instruction: "User-facing messages, friendly tone"
```

## Working with Existing .strings Files

1. **Run `lara-cli init`** to create your configuration
2. **Ensure your file paths match the `include` patterns**
3. **Run `lara-cli translate`**
4. **Continue developing** - Lara CLI tracks changes via checksums

If your `.strings` files don't exist yet:

1. **Create your source locale file** (e.g., `en.lproj/Localizable.strings`)
2. **Run `lara-cli translate`** - target locale files are created automatically

## Limitations

- Must use `"key" = "value";` format
- Keys and values must be double-quoted
- Each entry must end with a semicolon
- Files must be organized by locale in `.lproj` directories

## Troubleshooting

### Keys Not Found

- Ensure entries follow the `"key" = "value";` format
- Check that semicolons are present at the end of each entry
- Verify the file encoding is UTF-8

### Comments Missing

- Lara CLI preserves block comments (`/* ... */`) and single-line comments (`// ...`)
- Comments are associated with the entry that follows them

## Related Documentation

- [Supported Formats](../formats.md) - Overview of all supported file formats
- [Files Configuration](../files.md) - General file configuration options
- [Xcode Stringsdict Files](./xcode-stringsdict-files.md) - Plural support for Xcode
- [Xcode String Catalogs](./xcode-xcstrings-files.md) - Modern Xcode 15+ format
