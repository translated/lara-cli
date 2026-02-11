# Android XML Files Configuration

This guide explains how to use Lara CLI with Android XML string resource files (`.xml`), commonly used in Android applications for internationalization.

## What are Android XML Files?

Android XML files are the standard format for storing string resources in Android applications. Lara CLI uses the structure `res/[locale]/strings.xml` where `[locale]` is replaced with the locale code (e.g., `res/en/strings.xml`, `res/es/strings.xml`).

Lara CLI supports Android XML files that follow the standard Android string resource format, including:

- Simple string resources (`<string>`)
- Plural resources (`<plurals>`)
- String array resources (`<string-array>`)
- Non-translatable strings (`translatable="false"`)

## Configuration

To configure Android XML files in your `lara.yaml`:

```yaml
files:
  xml:
    include:
      - "res/[locale]/strings.xml"
      - "app/src/main/res/[locale]/strings.xml"
    exclude: []
    lockedKeys: []
    ignoredKeys: []
```

> **Note:** The configuration key is `xml` (matching the file extension), but this parser is specifically designed for Android XML string resource files. Other XML formats are not supported.
>
> **Important:** Lara CLI uses `res/[locale]/strings.xml` structure (e.g., `res/en/strings.xml`, `res/es/strings.xml`), not the standard Android `values-[locale]` structure. The `[locale]` placeholder is replaced directly with the locale code.

### File Path Patterns

Android XML files can be configured using the `[locale]` placeholder pattern. Lara CLI uses a simplified structure where the locale code replaces `[locale]` directly in the path.

#### Standard Structure (Recommended)

Use the standard structure with locale directories:

```yaml
files:
  xml:
    include:
      - "res/[locale]/strings.xml"
      - "res/[locale]/errors.xml"
```

This follows the structure:

```text
res/
  ├── en/                  (English)
  │   ├── strings.xml
  │   └── errors.xml
  ├── es/                  (Spanish)
  │   ├── strings.xml
  │   └── errors.xml
  ├── fr/                  (French)
  │   ├── strings.xml
  │   └── errors.xml
  └── de/                  (German)
      ├── strings.xml
      └── errors.xml
```

#### Alternative Structure

You can also use a custom directory structure:

```yaml
files:
  xml:
    include:
      - "app/src/main/res/[locale]/strings.xml"
      - "translations/[locale]/strings.xml"
```

## Android XML File Structure

### Required Format

Lara CLI expects Android XML files to follow this structure:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">My App</string>
    <string name="hello">Hello World</string>
</resources>
```

The parser extracts string resources from the `<resources>` element and processes them for translation.

### Simple String Resources

Basic string resources use the `<string>` element:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">My App</string>
    <string name="welcome_message">Welcome to our application</string>
    <string name="button_submit">Submit</string>
    <string name="button_cancel">Cancel</string>
</resources>
```

### Plural Resources

Plural resources handle singular and plural forms for different quantities:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <plurals name="item_count">
        <item quantity="zero">No items</item>
        <item quantity="one">%d item</item>
        <item quantity="two">%d items</item>
        <item quantity="few">%d items</item>
        <item quantity="many">%d items</item>
        <item quantity="other">%d items</item>
    </plurals>
</resources>
```

**Supported quantity values:**

- `zero` - Zero items
- `one` - One item
- `two` - Two items
- `few` - Few items
- `many` - Many items
- `other` - Other (default/fallback)

### String Array Resources

String array resources contain an ordered list of string values:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string-array name="colors">
        <item>Red</item>
        <item>Green</item>
        <item>Blue</item>
    </string-array>
    <string-array name="sizes">
        <item>Small</item>
        <item>Medium</item>
        <item>Large</item>
    </string-array>
</resources>
```

String arrays are mapped with index-based keys: `colors/0`, `colors/1`, `colors/2`, etc.

### Non-Translatable Strings

Strings marked with `translatable="false"` are preserved but not translated:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name" translatable="false">My App</string>
    <string name="hello">Hello World</string>
</resources>
```

### Mixed Resources

You can combine strings, plurals, and string arrays in the same file:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">My App</string>
    <string name="welcome">Welcome</string>
    <plurals name="item_count">
        <item quantity="one">%d item</item>
        <item quantity="other">%d items</item>
    </plurals>
    <string-array name="colors">
        <item>Red</item>
        <item>Green</item>
        <item>Blue</item>
    </string-array>
    <string name="goodbye">Goodbye</string>
</resources>
```

### Special Characters

Android XML supports XML entities for special characters:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="message">Hello &amp; Welcome</string>
    <string name="quoted">Say &quot;Hello&quot;</string>
    <string name="less_than">A &lt; B</string>
    <string name="greater_than">C &gt; D</string>
    <string name="apostrophe">Don&apos;t worry</string>
</resources>
```

Lara CLI automatically handles XML entity encoding and decoding.

## How Lara CLI Handles Android XML Files

### Automatic Processing

Lara CLI automatically:

- ✅ Extracts string resources from `<resources>` elements
- ✅ Preserves the original XML structure and formatting
- ✅ Handles plural resources with quantity-specific keys
- ✅ Handles string array resources with index-based keys
- ✅ Maintains resource order from the original file
- ✅ Preserves non-translatable strings (`translatable="false"`)
- ✅ Handles XML entity encoding/decoding
- ✅ Preserves XML declaration and encoding

### Key Path Format

When using `lockedKeys` or `ignoredKeys` with Android XML files, use the resource name format:

**Simple strings:**

- Use the string name directly: `app_name`, `hello`, `welcome_message`

**Plural resources:**

- Use the format `plural_name/quantity`: `item_count/one`, `item_count/other`

**String array resources:**

- Use the format `array_name/index`: `colors/0`, `colors/1`, `colors/2`

```yaml
files:
  xml:
    include:
      - "res/[locale]/strings.xml"
    lockedKeys:
      - "app_name"              # Specific string resource
      - "item_count/one"        # Specific plural quantity
      - "colors/0"              # Specific string array item
      - "api_*"                 # Wildcard pattern
    ignoredKeys:
      - "debug_*"               # Ignore all debug keys
      - "test_*"                # Ignore all test keys
```

### Resource Order Preservation

Lara CLI preserves the original order of resources in your XML file. Resources are sorted and written back in the same order they appeared in the source file.

## Complete Example

Here's a complete configuration example for an Android project:

```yaml
version: "1.0.0"

project:
  instruction: "Mobile application, user-friendly tone"

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
  xml:
    include:
      - "res/[locale]/strings.xml"
      - "res/[locale]/errors.xml"
    exclude:
      - "res/[locale]/test-*.xml"
    lockedKeys:
      - "app_name"
      - "app_version"
      - "api_*"
    ignoredKeys:
      - "debug_*"
      - "test_*"
    fileInstructions:
      - path: "res/[locale]/strings.xml"
        instruction: "User-facing messages, friendly and professional tone"
      - path: "res/[locale]/errors.xml"
        instruction: "Error messages should be clear and helpful"
```

## Working with Existing Android XML Files

If you already have Android XML files with translations:

1. **Run `lara-cli init`** to create your configuration
2. **Ensure your file paths match the `include` patterns** (use `[locale]` placeholder)
3. **Run `lara-cli translate`**
4. **Continue developing** - Lara CLI tracks changes via checksums and only translates what's new or modified

If your Android XML files don't exist yet:

1. **Create your source locale file** (e.g., `res/en/strings.xml`)
2. **Run `lara-cli translate`** - Lara CLI will create locale-specific files automatically
3. **The files will be created with the appropriate structure**

## Limitations

### File Format Requirements

- ✅ Must contain `<resources>` root element
- ✅ Must use valid XML syntax
- ✅ Supports `<string>`, `<plurals>`, and `<string-array>` elements
- ✅ Supports `translatable` attribute
- ❌ Does not support other resource types (generic arrays, etc.)
- ❌ Does not support resource references (`@string/...`)

### Supported Patterns

- ✅ Standard structure: `res/[locale]/strings.xml`
- ✅ Custom directory structure: `translations/[locale]/strings.xml`
- ✅ Multiple files per locale: `res/[locale]/*.xml`
- ❌ Files without `[locale]` placeholder are not supported
- ❌ Single XML files (must be organized by locale)
- ❌ Standard Android `values-[locale]` structure is not supported (use `[locale]` instead)

### Resource Types

**Supported:**

- `<string>` - Simple string resources
- `<plurals>` - Plural resources with quantity items
- `<string-array>` - String array resources with indexed items

**Not Supported:**

- `<array>` - Generic arrays (non-string arrays)
- Resource references (`@string/...`, `@color/...`, etc.)
- Other Android resource types

### Fallback Content

If Lara CLI needs to create a new Android XML file and cannot find an existing one, it will use this fallback:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
</resources>
```

## Troubleshooting

### Resources Not Found

If Lara CLI cannot find your resources:

- Ensure your file contains `<resources>` root element
- Check that the file path in `lara.yaml` matches your actual file location
- Verify the `[locale]` placeholder is correctly positioned
- Ensure the XML syntax is valid

### Plural Resources Not Working

If plural resources aren't being processed correctly:

- Ensure each `<plurals>` element has a `name` attribute
- Verify each `<item>` has a `quantity` attribute
- Check that at least one quantity is specified
- Ensure the XML structure is valid

### Order Changes

Lara CLI preserves resource order. If you notice changes:

- Ensure your source XML file is properly formatted
- The parser maintains the order from the original file
- Resources are sorted based on their appearance in the source file

### Special Characters

If special characters aren't displaying correctly:

- Lara CLI automatically handles XML entity encoding/decoding
- Ensure your source file uses proper XML entities (`&amp;`, `&quot;`, etc.)
- The parser converts entities during parsing and re-encodes during serialization

### Non-Translatable Strings

If non-translatable strings are being translated:

- Ensure `translatable="false"` is set correctly
- Check that the attribute value is exactly `"false"` (case-sensitive)
- Verify the attribute is on the correct element

### Key Path Format

When using `lockedKeys` or `ignoredKeys`:

**Simple strings:**

```yaml
lockedKeys:
  - "app_name"           # Exact string name
  - "button_*"           # Wildcard pattern
```

**Plural resources:**

```yaml
lockedKeys:
  - "item_count/one"     # Specific quantity
  - "item_count/*"       # All quantities for item_count
  - "*/one"              # All 'one' quantities
```

## Related Documentation

- [Supported Formats](./formats.md) - Overview of all supported file formats
- [Files Configuration](./files.md) - General file configuration options
- [Instructions](./instructions.md) - How to use translation instructions
- [Locales](./locales.md) - Supported locale codes
