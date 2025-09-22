# Init Command

The `init` command initializes a new Lara project by creating a configuration file ([lara.yaml](lara_yaml.md)) that defines the localization settings for your project. This is the first step to set up internationalization in your application.

## Overview

The init command helps you configure your project for translation by creating a `lara.yaml` file in your project's root directory. This file contains all necessary settings for Lara CLI to manage your internationalization files, including:

- Source and target locales
- File paths to watch
- Translation rules and exclusions

There are two operating modes available for generating a `lara.yaml` file for your project:

## Operating Modes

### Interactive Mode (Default)
When running `lara-cli init` without the `--non-interactive` flag, the command operates in interactive mode:

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
Running `lara-cli init` with the `--non-interactive` flag generates a `lara.yaml` file directly from the command options without any user prompts.

See: [Init Command Options](#init-command-options) for available options.

```bash
# Example of non-interactive mode
lara-cli init --source "en" --target "es, fr" --paths "./src/translations/locales/en/en.json" --force --non-interactive
```


Both approaches create a `lara.yaml` file with [basic configuration properties](lara_yaml.md#basic-configuration).

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

For complete details about the configuration file, see the [Lara.yaml Configuration Reference](lara_yaml.md)


## Post-Initialization

After successful initialization, the command provides guidance for next steps:

1. **Environment Setup**: Reminds you to add API keys to your `.env` file if they couldn't be found in the project's root folder
2. **Translation Command**: Suggests running `lara-cli translate` to begin translating files
3. **Documentation**: Points to the support documentation at https://support.laratranslate.com/en/about-lara

Proceed to the [translate command documentation](translate.md#translate-command) or continue reading for [Init Command Options](#init-command-options) 


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

## Examples

### Basic Interactive Initialization

```bash
# Start interactive initialization with defaults
lara-cli init
```

### Force Overwrite Existing Configuration

```bash
# Overwrite existing configuration file in interactive mode
lara-cli init --force
```

### Specify Source and Target Languages

```bash
# Initialize with Spanish as source and English and French as targets
lara-cli init --source "es" --target "en, fr"
```

### Custom Path Configuration

```bash
# Define custom paths for translation files
lara-cli init --paths "src/locales/[locale]/messages.json, public/i18n/[locale].json"
```

### Complete Non-Interactive Setup

```bash
# Full non-interactive configuration with all options
lara-cli init --source "en" --target "de, fr, it" --paths "src/i18n/[locale]/common.json, src/i18n/[locale]/pages.json" --force --non-interactive
```

### Getting Help

```bash
# Display help for the init command
lara-cli init --help
```