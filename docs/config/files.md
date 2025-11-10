# Files Configuration

The `files` section defines which files should be translated and how they should be processed.

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
- **Description**: Identifies keys that should be completely excluded from target files
- **Format**: Uses glob patterns for matching keys (e.g., `internal/**`, `**/debug`)

## Locked vs Ignored Keys

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
Keys marked as ignored are **excluded** from target files entirely. Use this for:
- Development-only messages
- Internal debugging information
- Keys not relevant to other locales

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

Target file (`es.json`):
```json
{
  "app": {
    "title": "Mi Aplicación",
    "version": "1.0.0"
  }
}
```

Note: The `debug` key is completely omitted from the target file.

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
```
