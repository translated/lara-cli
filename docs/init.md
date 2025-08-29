
# Init Command

The `init` command initializes a new Lara project by creating a configuration file (`lara.yaml`) that defines the localization settings for your project. This is the first step to set up internationalization in your application.

## Overview

The init command creates a `lara.yaml` configuration file in your project's root directory. This file contains all the necessary settings for the Lara CLI to manage your internationalization files, including source and target locales, file paths to watch, and translation rules.

## Usage

### Basic Usage
```bash
lara init
```

### Non-Interactive Mode
```bash
lara init --source en-US --target "es-ES, fr-FR" --paths "./src/i18n/[locale].json" --force
```

## Command Options

### `-f, --force`
- **Type**: Boolean
- **Default**: `false`
- **Description**: Overwrites an existing config file without prompting for confirmation

### `-s, --source <locale>`
- **Type**: String (locale code)
- **Default**: `en-US`
- **Description**: Sets the source locale for your project
- **Validation**: Must be a valid locale from the supported locales list

### `-t, --target <locales>`
- **Type**: String (comma/space-separated locales)
- **Default**: `["it-IT", "es-ES"]`
- **Description**: Sets the target locales for translation
- **Format**: Locales can be separated by commas, spaces, or both (e.g., `"es-ES, fr-FR"` or `"es-ES fr-FR"`)
- **Validation**: Each locale must be valid and supported and should not contain the source locale

### `-p, --paths <paths>`
- **Type**: String (comma/space-separated paths)
- **Default**: `["./src/i18n/[locale].json"]`
- **Description**: Defines the file paths to watch for internationalization files
- **Format**: Paths can be separated by commas, spaces, or both
- **Requirements**: 
  - Must be relative paths (cannot start with `/`, `./`, or `../`)
  - Must contain the `[locale]` placeholder
  - Must end with a supported file extension (currently `.json`)
  - Must use `[locale]` either in directory (`/[locale]/`) or filename (`[locale].extension`)

### `-h, --help`
- **Description**: Shows help information for the command

## Supported Locales

The init command supports the following locales:
`ar-SA`, `bg-BG`, `ca-ES`, `cs-CZ`, `da-DK`, `de-DE`, `el-GR`, `en-AU`, `en-CA`, `en-GB`, `en-IE`, `en-US`, `es-419`, `es-AR`, `es-ES`, `es-MX`, `fi-FI`, `fr-CA`, `fr-FR`, `he-IL`, `hr-HR`, `hu-HU`, `id-ID`, `it-IT`, `ja-JP`, `ko-KR`, `ms-MY`, `nb-NO`, `nl-BE`, `nl-NL`, `pl-PL`, `pt-BR`, `pt-PT`, `ru-RU`, `sk-SK`, `sv-SE`, `th-TH`, `tr-TR`, `uk-UA`, `zh-CN`, `zh-HK`, `zh-TW`

## Operating Modes

### Interactive Mode (Default)
When run without the `--non-interactive` flag, the command operates in interactive mode:

1. **Config File Check**: If a `lara.yaml` file already exists and `--force` is not used, prompts for confirmation to overwrite
2. **Source Locale Input**: Prompts for the source locale with validation
3. **Target Locales Selection**: Shows a checkbox list of available locales (excluding the source locale)
4. **Path Discovery**: 
   - Automatically searches for existing internationalization files in your project
   - If files are found, presents them as selectable options
   - If no files are found, prompts for manual path input with validation

### Non-Interactive Mode
When specific options are provided via command line arguments, the command runs in non-interactive mode and uses the provided values directly.

## Generated Configuration

The command generates a `lara.yaml` file with the following structure:

```yaml
version: "1.0.0"
locales:
  source: en-US
  target:
    - es-ES
    - it-IT
files:
  json:
    include:
      - "./src/i18n/[locale].json"
    exclude: []
    lockedKeys: []
    ignoredKeys: []
```

### Configuration Properties

- **version**: Configuration schema version
- **locales.source**: The source locale for your content
- **locales.target**: Array of target locales for translation
- **files.json.include**: Array of file paths to monitor for translation
- **files.json.exclude**: Array of file paths to exclude from translation (empty by default)
- **files.json.lockedKeys**: Array of keys that should not be translated (empty by default)
- **files.json.ignoredKeys**: Array of keys to ignore during translation (empty by default)

## Path Pattern Examples

Valid path patterns must include the `[locale]` placeholder:

### Directory-based patterns:
- `./src/i18n/[locale]/common.json`
- `./locales/[locale]/app.json`
- `./translations/[locale]/messages.json`

### Filename-based patterns:
- `./src/i18n/[locale].json`
- `./locales/app.[locale].json`
- `./i18n/messages.[locale].json`


### Mixed patterns:
- `/src/i18n/[locale]/[locale].json`

## File Discovery

The command automatically searches for existing internationalization files by:

1. Scanning all JSON files in the project (excluding common build/dependency directories)
2. Identifying files that contain supported locale codes in their paths
3. Presenting unique patterns for selection

Excluded directories during search:
- `node_modules`
- `dist`
- `build` 
- `bin`
- `out`
- `spec`
- `test`
- `tests`

## Post-Initialization

After successful initialization, the command provides guidance for next steps:

1. **Environment Setup**: Reminds you to add API keys to your `.env` file
2. **Translation Command**: Suggests running `lara translate` to begin translating files
3. **Documentation**: Points to the support documentation at https://support.laratranslate.com/en/about-lara

## Examples

### Initialize with defaults in interactive mode:
```bash
lara init
```

### Initialize with Spanish and French as targets:
```bash
lara init --target "es-ES, fr-FR"
```

### Force overwrite existing config with custom paths:
```bash
lara init --force --paths "./app/i18n/[locale].json, ./shared/translations/[locale].json"
```

### Complete non-interactive setup:
```bash
lara init --source en-US --target "es-ES, fr-FR, de-DE" --paths "./src/locales/[locale].json" --force
```