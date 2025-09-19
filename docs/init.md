# Init Command

The `init` command initializes a new Lara project by creating a configuration file (`lara.yaml`) that defines the localization settings for your project. This is the first step to set up internationalization in your application.

## Overview

The init command helps you configure your project for translation by creating a `lara.yaml` file in your project's root directory. This file contains all necessary settings for Lara CLI to manage your internationalization files, including:

- Source and target locales
- File paths to watch
- Translation rules and exclusions

There are two ways to generate a `lara.yaml` file for your project:

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

```bash
# Example of interactive mode
lara-cli init
```

### Non-Interactive Mode
This mode generates the `lara.yaml` file directly based on command options without prompting for input.

See: [Init Command Options](#init-command-options) for available options.

```bash
# Example of non-interactive mode
lara-cli init --source "en" --target "es, fr" --paths "./src/translations/locales/en/en.json" --force --non-interactive
```


Both approaches create a `lara.yaml` file with the default configuration properties.

## The Lara.yaml Configuration File

The `lara.yaml` file defines which locales will be used and which files the script will translate. After successfully running the command, you will see this file in your project's root directory.

A typical configuration looks like this:

```yaml
version: "1.0.0"
locales:
  source: en
  target:
    - es
    - it
files:
  json:
    include:
      - "./src/i18n/en.json"
    exclude: []
    lockedKeys: []
    ignoredKeys: []
```

By default, only `locales.source`, `locales.target` and `files.json.include` properties will be populated with your selected data, but there are additional properties you can configure later.

For more details, see: [Lara.yaml Properties](#larayaml-properties)


## Post-Initialization

After successful initialization, the command provides guidance for next steps:

1. **Environment Setup**: Reminds you to add API keys to your `.env` file if they couldn't be found in the project's root folder
2. **Translation Command**: Suggests running `lara-cli translate` to begin translating files
3. **Documentation**: Points to the support documentation at https://support.laratranslate.com/en/about-lara

Proceed to the translate command documentation [here](translate.md#translate-command) or keeping reading for [Init Command Options](#init-command-options) 


## Init Command Options

### `-y`, `--non-interactive`
- **Description**: Runs the command in non-interactive mode, using provided options instead of prompting for input

### `-f`, `--force`
- **Description**: If provided, it will overwrite an existing config file without prompting for confirmation

### `-s <locale>`, `--source <locale>`
- **Type**: String (locale code)
- **Default**: `en`
- **Description**: Sets the source locale for your project
- **Validation**: Must be a valid locale from the supported locales list
- **example**: `-s en`, `--source en`

### `-t <locales>`, `--target <locales>`
- **Type**: String (comma/space-separated locales)
- **Description**: Sets the target locales for translation
- **Validation**: Must be a valid locale from the supported locales list
- **example**: `-t "de, it"`, `--target "de, it"`

### `-p <paths>`, `--paths <paths>`
- **Type**: String (comma/space-separated paths)
- **Default**: `["./src/i18n/[locale].json"]`
- **Description**: Defines the file paths to watch for internationalization files
- **Format**: Paths can be separated by commas, spaces, or both
- **Requirements**: 
  - Must be relative paths (cannot start with `/`, `./`, or `../`)
  - Must contain the `[locale]` placeholder
  - Must end with a supported file extension (currently `.json`)
  - Must use `[locale]` either in directory (`/[locale]/`) or filename (`[locale].extension`)
- **example**: `-p src/translations/locales/[locale]/[locale].json`

### `-h`, `--help`
- **Description**: Shows help information for the command


## Lara.yaml Properties

The configuration file contains several properties that control the behavior of Lara CLI:

- **version**: Configuration schema version
- **locales.source**: The source [locale](../README.md#supported-locales) for your content
- **locales.target**: Array of target [locales](../README.md#supported-locales) for translation
- **files.json.include**: Array of [file paths](#path-pattern-examples) to monitor for translation
- **files.json.exclude**: Array of [file paths](#path-pattern-examples) to exclude from translation (empty by default)
- **files.json.lockedKeys**: Array of keys that should not be translated (empty by default)
- **files.json.ignoredKeys**: Array of keys to ignore during translation (empty by default)

### Path Pattern Examples

Valid path patterns **must** include the `[locale]` placeholder:

#### Directory-based patterns:
- `src/i18n/[locale]/common.json`
- `locales/[locale]/app.json`
- `translations/[locale]/messages.json`

#### Filename-based patterns:
- `src/i18n/[locale].json`
- `locales/app.[locale].json`
- `i18n/messages.[locale].json`

### Mixed patterns:
- `src/i18n/[locale]/[locale].json`

### File Discovery

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

## Pattern Matching

The command supports glob patterns for flexible file and key matching in the configuration file:

- `*`: Matches any characters except path separators
- `**`: Matches any characters including path separators (recursive)
- `?`: Matches any single character
- `[abc]`: Matches any character in the specified set
- `{a,b}`: Matches any of the listed alternatives

### Key Pattern Examples for Locked and Ignored Keys
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

### Configuration Examples

#### Basic Configuration
```yaml
version: 1.0.0
locales:
  source: en
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

#### Advanced Configuration
```yaml
version: 1.0.0
project:
  context: "E-commerce platform for fashion retail" # Context used in translations
locales:
  source: en
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