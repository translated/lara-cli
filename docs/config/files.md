# Files Configuration

The `files` section defines which files should be translated and how they should be processed.

## Supported Formats

Lara CLI supports multiple file formats (JSON, PO, etc.). Each format is configured separately under the `files` section. See [Supported Formats](./formats.md) for a complete list and format-specific documentation.

The parser is automatically selected based on the file extension.
> **See also**: [File Structure and Formats](./supported_formats.md) for detailed information about supported file formats, JSON structure, file discovery, and best practices.

## Configuration

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
    includeKeys:
      - "ui/**"
      - "messages/**"
```

## Properties

### include

- **Type**: Array of strings (file paths with `[locale]` placeholder)
- **Required**: Yes
- **Description**: Specifies which files should be processed for translation
- **Format**: Paths must contain the `[locale]` placeholder and can use glob patterns

### exclude

- **Type**: Array of strings (file patterns)
- **Required**: No (defaults to empty array)
- **Description**: Specifies patterns for files that should be excluded from translation
- **Format**: Uses the same pattern syntax as `include`

### lockedKeys

- **Type**: Array of strings (key patterns)
- **Required**: No (defaults to empty array)
- **Description**: Identifies keys that should not be translated (source value is copied to target)
- **Format**: Uses glob patterns for matching keys (e.g., `**/id`, `config/*/url`)

### ignoredKeys

- **Type**: Array of strings (key patterns)
- **Required**: No (defaults to empty array)
- **Description**: Identifies keys that should be left untouched in target files (not translated, not added, not removed)
- **Format**: Uses glob patterns for matching keys (e.g., `internal/**`, `**/debug`)

### includeKeys

- **Type**: Array of strings (key patterns)
- **Required**: No (defaults to empty array)
- **Description**: When specified, only keys matching these patterns will be translated. All other keys are treated as ignored (preserved in existing target files, not added to new ones). When empty (default), all keys are included.
- **Format**: Uses glob patterns for matching keys (e.g., `ui/**`, `messages/*`)

## Locked vs Ignored vs Include Keys

Understanding the difference between `lockedKeys` and `ignoredKeys`:

### Locked Keys

Keys marked as locked are **copied** from source to target files without translation. Use this for:

- IDs, codes, and identifiers
- URLs and API endpoints
- Configuration values that shouldn't change

**Example:**

Source file (`en.json`):

```json
{
  "user": {
    "id": "USER_001",
    "name": "John Doe",
    "role": "admin"
  }
}
```

Configuration:

```yaml
lockedKeys:
  - "**/id"
  - "**/role"
```

Target file (`es.json`):

```json
{
  "user": {
    "id": "USER_001",
    "name": "Juan Pérez",
    "role": "admin"
  }
}
```

### Ignored Keys

Keys marked as ignored are **left untouched** in target files. They are not translated, not added, and not removed. Use this for:

- Development-only messages that may have been manually added to targets
- Keys managed by other tools or processes
- Keys not relevant to the translation workflow

**Example:**

Source file (`en.json`):

```json
{
  "app": {
    "title": "My Application",
    "debug": "Debug mode enabled",
    "version": "1.0.0"
  }
}
```

Configuration:

```yaml
ignoredKeys:
  - "**/debug"
```

Target file (`es.json`) - if `debug` was never added:

```json
{
  "app": {
    "title": "Mi Aplicación",
    "version": "1.0.0"
  }
}
```

Target file (`es.json`) - if `debug` already existed:

```json
{
  "app": {
    "title": "Mi Aplicación",
    "debug": "Modo depuración activado",
    "version": "1.0.0"
  }
}
```

Note: The `debug` key is never translated or modified by Lara. If it already exists in the target, it is preserved as-is. If it does not exist, it is not added.

### Include Keys

Keys listed in `includeKeys` define a whitelist: only matching keys are translated. All non-matching keys behave as if they were ignored. When `includeKeys` is empty (the default), all keys are in scope.

Use this for:

- Translating only a specific subset of a large file
- Gradually rolling out translations for new keys
- Focusing translation on specific namespaces

**Example:**

Source file (`en.json`):

```json
{
  "ui": {
    "title": "My Application",
    "subtitle": "Welcome"
  },
  "internal": {
    "debug": "Debug mode",
    "version": "1.0.0"
  }
}
```

Configuration:

```yaml
includeKeys:
  - "ui/**"
```

Target file (`es.json`):

```json
{
  "ui": {
    "title": "Mi Aplicación",
    "subtitle": "Bienvenido"
  }
}
```

Note: Only `ui/**` keys are translated. The `internal` keys are not added to the target file. If they already existed in the target, they would be preserved as-is.

**Interaction with `lockedKeys` and `ignoredKeys`:**

`includeKeys` is evaluated first. Among included keys, `lockedKeys` and `ignoredKeys` still apply normally. Non-included keys are always treated as ignored, regardless of other settings.

## Path Patterns

Paths in the `include` and `exclude` arrays must use the `[locale]` placeholder to indicate where locale codes should appear.

### Directory-based Patterns

```yaml
include:
  - "src/i18n/[locale]/common.json"
  - "locales/[locale]/app.json"
```

### Filename-based Patterns

```yaml
include:
  - "src/i18n/[locale].json"
  - "locales/app.[locale].json"
```

## Glob Pattern Syntax

- `*`: Matches any characters except path separators
- `**`: Matches any characters including path separators (recursive)
- `?`: Matches any single character
- `[abc]`: Matches any character in the specified set
- `{a,b}`: Matches any of the listed alternatives

## Examples

### Basic Configuration

```yaml
files:
  json:
    include:
      - "src/i18n/[locale].json"
    exclude: []
    lockedKeys: []
    ignoredKeys: []
    includeKeys: []
```

### Complex Configuration

```yaml
files:
  json:
    include:
      - "src/i18n/[locale]/*.json"
      - "public/locales/[locale]/**/*.json"
    exclude:
      - "src/i18n/[locale]/draft-*.json"
      - "**/metadata/**"
    lockedKeys:
      - "**/id"
      - "**/url"
      - "config/**"
    ignoredKeys:
      - "internal/**"
      - "**/debug"
    includeKeys:
      - "ui/**"
      - "messages/**"
```
