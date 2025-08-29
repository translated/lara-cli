# Translate Command

The `translate` command processes all internationalization files specified in your `lara.yaml` configuration and translates them from the source locale to the target locales using the Lara translation service.

## Overview

The translate command is the core functionality of the Lara CLI. It reads your source locale files, detects changes since the last translation run, and translates only new or modified content to preserve manual edits while keeping translations up-to-date. The command uses intelligent change detection and supports advanced features like locked keys, ignored keys, and project context.

## Usage

### Basic Usage
```bash
lara translate
```

### Translate to specific locales
```bash
lara translate --target "es-ES, fr-FR"
```

### Force retranslation of all content
```bash
lara translate --force
```

## Prerequisites

Before using the translate command, you must:

1. **Initialize your project**: Run `lara init` to create a `lara.yaml` configuration file
2. **Set up environment variables**: Configure your Lara API credentials in a `.env` file:
   ```bash
   LARA_ACCESS_KEY_ID=your_access_key_id
   LARA_ACCESS_KEY_SECRET=your_access_key_secret
   ```
3. **Ensure source files exist**: Create your source locale files with the content to translate

## Command Options

### `-t, --target <locales>`
- **Type**: String (comma/space-separated locales)
- **Default**: Uses target locales from `lara.yaml` configuration
- **Description**: Specifies which target locales to translate to
- **Format**: Locales can be separated by commas, spaces, or both (e.g., `"es-ES, fr-FR"` or `"es-ES fr-FR"`)
- **Validation**: Each locale must be valid and supported; cannot include the source locale

### `-f, --force`
- **Type**: Boolean
- **Default**: `false`
- **Description**: Forces retranslation of all content, even if files haven't changed since the last run
- **Use case**: Useful when you want to regenerate all translations or when translation quality has improved

### `-h, --help`
- **Description**: Shows help information for the command

## How It Works

### 1. Configuration Loading
The command loads your `lara.yaml` configuration file to determine:
- Source and target locales
- File patterns to process
- Exclusion patterns
- Locked and ignored key patterns
- Project context (if specified)

### 2. File Discovery
For each file type in your configuration:
- **Static paths**: Files without wildcards are processed directly
- **Dynamic paths**: Files with wildcards (`*`) are discovered using glob patterns
- **Exclusion filtering**: Files matching exclusion patterns are skipped

### 3. Change Detection
The translation engine uses intelligent change detection:
- **Checksum calculation**: Creates MD5 hashes of all translation keys
- **Lock files**: Stores checksums in `.lara/` directory for future comparisons

### 4. Translation Processing
For each discovered file and target locale:
- **Key analysis**: Processes each translation key individually
- **Conditional translation**: Only translates keys that need updating
- **Key filtering**: Respects locked and ignored key patterns
- **Context application**: Uses project context to improve translation quality

### 5. Output Generation
- **File structure preservation**: Maintains the original JSON structure
- **Directory creation**: Automatically creates target directories if needed
- **JSON formatting**: Outputs properly formatted JSON with 4-space indentation

## Key Processing Logic

The translation engine processes each key according to these rules:

### Ignored Keys
- **Behavior**: Keys matching `ignoredKeys` patterns are completely excluded from target files
- **Use case**: Metadata, configuration values, or keys that should not be translated
- **Pattern matching**: Uses glob patterns for flexible matching

### Locked Keys
- **Behavior**: Keys matching `lockedKeys` patterns use the source value without translation
- **Use case**: IDs, paths, URLs, or other values that should remain identical across locales
- **Pattern matching**: Uses glob patterns for flexible matching

### Translation Decision Flow
1. **If ignored**: Key is excluded from target file
2. **If locked**: Source value is copied directly to target
3. **If target value missing OR force flag**: Key is translated
4. **If unchanged**: Existing target value is preserved
5. **If new AND target exists**: Existing target value is preserved
6. **If updated**: Key is retranslated

### Non-String Values
- **Behavior**: Non-string values (numbers, booleans, objects) are copied directly without translation
- **Rationale**: Only string values can be meaningfully translated

## File Structure

### Source Files
Source files must follow the patterns specified in your `lara.yaml` configuration:
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

### Target Files
Target files are generated automatically with the same structure:
```json
{
  "dashboard": {
    "title": "Tableau de bord",
    "buttons": {
      "save": "Enregistrer", 
      "cancel": "Annuler"
    }
  }
}
```

### Internal Processing
The engine flattens JSON for processing and restores structure on output:
```json
// Flattened for processing
{
  "dashboard/title": "Dashboard",
  "dashboard/buttons/save": "Save",
  "dashboard/buttons/cancel": "Cancel"
}
```

## Change Detection System

### Checksum Storage
- **Location**: `.lara/` directory in your project root
- **Format**: YAML files named with MD5 hashes of file paths
- **Content**: Version and key-value checksums

### Lock File Example
```yaml
# .lara/abc123.lock
version: 1.0.0
keys:
  dashboard/title: 5d41402abc4b2a76b9719d911017c592
  dashboard/buttons/save: 098f6bcd4621d373cade4e832627b4f6
```

### Change States
- **new**: Key exists in source but not in previous checksum
- **updated**: Key exists but content hash has changed
- **unchanged**: Key exists with identical hash

## Configuration Examples

### Basic Configuration
```yaml
version: 1.0.0
locales:
  source: en-US
  target:
    - es-ES
    - fr-FR
files:
  json:
    include:
      - ./src/i18n/[locale].json
    exclude: []
    lockedKeys: []
    ignoredKeys: []
```

### Advanced Configuration
```yaml
version: 1.0.0
project:
  context: "E-commerce platform for fashion retail" # Context used in translations
locales:
  source: en-US
  target:
    - es-ES
    - fr-FR
    - de-DE
files:
  json:
    include:
      - ./src/i18n/[locale]/**/*.json
      - ./public/locales/[locale].json
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

## Pattern Matching

### Pattern Matching
The command supports glob patterns for flexible file and key matching:

- `*`: Matches any characters except path separators
- `**`: Matches any characters including path separators (recursive)
- `?`: Matches any single character
- `[abc]`: Matches any character in the specified set
- `{a,b}`: Matches any of the listed alternatives

### Key Pattern Examples
```yaml
lockedKeys:
  - "**/id"           # Any key ending with "id"
  - "api/**"          # Any key starting with "api/"
  - "config/*/url"    # URLs in config sections
  - "metadata/**"     # Entire metadata sections

ignoredKeys:
  - "internal/**"     # Internal configuration
  - "**/debug"        # Debug information
  - "temp/**"         # Temporary data
```

## Examples

### Translate all configured locales
```bash
lara translate
```

### Translate specific locales only
```bash
lara translate --target "es-ES, fr-FR"
```

### Force retranslation of everything
```bash
lara translate --force
```

### Translate single locale with force
```bash
lara translate --target "es-ES" --force
```