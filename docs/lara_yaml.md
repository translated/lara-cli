# Lara.yaml Configuration Reference

The `lara.yaml` configuration file defines how Lara CLI should handle your project's internationalization. This file is created by running `lara-cli init` (in either interactive or non-interactive mode) and is placed in your project's root directory.

## File Structure

A basic `lara.yaml` file has the following structure:

```yaml
version: "1.0.0"
locales:
  source: en
  target:
    - es
    - fr
files:
  json:
    include:
      - "src/i18n/[locale].json"
    exclude: []
    lockedKeys: []
    ignoredKeys: []
```

## Core Configuration Sections

### Version

```yaml
version: "1.0.0"
```

The `version` field specifies the schema version of the configuration file. This helps with backward compatibility as the Lara CLI evolves.

### Locales

```yaml
locales:
  source: en
  target:
    - es
    - fr
```

The `locales` section defines the source and target languages for translation:

- **source**: The source locale code from which content will be translated
- **target**: An array of target locale codes to which content will be translated

For a full list of supported locales, see the [Supported Locales](../README.md#supported-locales) section in the main README.

### Files

The `files` section contains configuration for different file types. Currently, Lara CLI supports JSON files for internationalization:

```yaml
files:
  json:
    include:
      - "src/i18n/[locale].json"
      - "public/locales/[locale]/translations.json"
    exclude:
      - "**/metadata/**"
    lockedKeys:
      - "**/id"
      - "config/*/url"
    ignoredKeys:
      - "internal/**"
```

Each file type has the following properties:

#### Include and Exclude Patterns

##### Include Paths

```yaml
include:
  - "src/i18n/[locale].json"
```

An array of file paths to monitor for translation. These paths:

- Must include the `[locale]` placeholder
- Must be relative paths
- Must have a supported file extension (currently `.json`)
- Can use glob patterns for matching multiple files

##### Exclude Paths

```yaml
exclude:
  - "**/metadata/**"
```

An array of file paths to exclude from translation. These follow the same pattern rules as include paths.

##### How Include and Exclude Work Together

The include and exclude patterns work together in the following way:

1. First, Lara CLI processes your `include` patterns to generate a list of files to translate
2. Then, for each file matched by the include patterns, it checks if the file also matches any exclude pattern
3. If a file matches an exclude pattern, it is skipped; otherwise, it is processed

Exclude patterns are most useful when you're using wildcard patterns in your include paths. Here are practical examples:

```yaml
# Example 1: Using exclude with wildcards
include:
  - "src/i18n/[locale]/*.json"  # All JSON files in this directory
exclude:
  - "src/i18n/[locale]/draft-*.json"  # Except draft files

# Example 2: Excluding specific files from a group
include:
  - "src/locales/[locale]/**/*.json"  # All JSON files in all subdirectories
exclude:
  - "src/locales/[locale]/internal/admin.json"  # Except this specific file

# Example 3: Real-world scenario
include:
  - "src/i18n/[locale]/pages/**/*.json"  # All page translations
  - "src/i18n/[locale]/components/**/*.json"  # All component translations
exclude:
  - "src/i18n/[locale]/pages/dev/**/*.json"  # Skip development pages
```

**Note:** Exclude patterns have little effect when your include patterns specify exact file paths without wildcards, as there's no potential for overlap.

#### Locked Keys

```yaml
lockedKeys:
  - "**/id"
  - "api/**"
```

An array of keys that should not be translated. When a key matches one of these patterns:

- The source value will be copied directly to the target file
- No translation will be performed

This is useful for:
- IDs
- URLs
- Technical values
- Code snippets

#### Ignored Keys

```yaml
ignoredKeys:
  - "internal/**"
  - "**/debug"
```

An array of keys to ignore during translation. When a key matches one of these patterns:

- The key will be completely excluded from target files
- The key won't appear at all in translated files

This is useful for:
- Metadata
- Debug information
- Internal configuration
- Values that should be omitted in translations

### Project Context

You can optionally provide a project context to improve translation quality:

```yaml
project:
  context: "E-commerce platform for fashion retail"
```

The context helps the translation engine better understand the domain of your content.

## Path Patterns

All path specifications in `lara.yaml` use the `[locale]` placeholder to identify where the locale code should be inserted.

### Directory-based Patterns

```
src/i18n/[locale]/common.json
locales/[locale]/app.json
translations/[locale]/messages.json
```

### Filename-based Patterns

```
src/i18n/[locale].json
locales/app.[locale].json
i18n/messages.[locale].json
```

### Mixed Patterns

```
src/i18n/[locale]/[locale].json
```

## Pattern Matching

The configuration file supports glob patterns for flexible file and key matching:

- `*`: Matches any characters except path separators
- `**`: Matches any characters including path separators (recursive)
- `?`: Matches any single character
- `[abc]`: Matches any character in the specified set
- `{a,b}`: Matches any of the listed alternatives

### Key Pattern Examples

```yaml
# Locked keys examples
lockedKeys:
  - "**/id"           # Any key ending with "id"
  - "api/**"          # Any key starting with "api/"
  - "config/*/url"    # URLs in config sections
  - "metadata/**"     # Entire metadata sections

# Ignored keys examples
ignoredKeys:
  - "internal/**"     # Internal configuration
  - "**/debug"        # Debug information
  - "temp/**"         # Temporary data
```

## Complete Configuration Examples

### Basic Configuration

```yaml
version: "1.0.0"
locales:
  source: en
  target:
    - es
    - fr
files:
  json:
    include:
      - "src/i18n/[locale].json"
    exclude: []
    lockedKeys: []
    ignoredKeys: []
```

### Advanced Configuration

```yaml
version: "1.0.0"
project:
  context: "E-commerce platform for fashion retail"
locales:
  source: en
  target:
    - es
    - fr
    - de
    - it
files:
  json:
    include:
      - "src/i18n/[locale]/**/*.json"
      - "public/locales/[locale].json"
    exclude:
      - "**/metadata/**"    # Exclude files contained in any metadata folder
      - "**/config/**"      # Exclude files contained in any config folder
    lockedKeys:
      - "**/id"
      - "**/path"
      - "**/url"
      - "api/**"
    ignoredKeys:
      - "metadata/**"
      - "internal/**"
```

## JSON Structure in Translation Files

Lara CLI processes JSON files with nested structures. For example, a source file might look like:

```json
{
  "dashboard": {
    "title": "Dashboard",
    "buttons": {
      "save": "Save",
      "cancel": "Cancel"
    }
  }
}
```

When processed internally, Lara flattens this structure using path notation:

```json
{
  "dashboard/title": "Dashboard",
  "dashboard/buttons/save": "Save",
  "dashboard/buttons/cancel": "Cancel"
}
```

This flattened structure is what the key patterns in `lockedKeys` and `ignoredKeys` match against.
