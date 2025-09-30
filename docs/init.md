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

1. **Credential Reset** (if `--reset-credentials` flag is provided):
   - Prompts for confirmation to reset API credentials
   - Asks for new API Key and Secret
   - Updates the `.env` file while preserving other environment variables

2. **Config File Check**: If a `lara.yaml` file already exists and `--force` is not used, prompts for confirmation to overwrite

3. **Source Locale Input**: Prompts for the source locale with searchable selection

4. **Target Locales Selection**:
   - **Auto-Detection**: Asks if you want to automatically detect target locales from your existing project files
   - If auto-detection finds locales:
     - Displays found locales (shows all for small lists, formatted table for large lists)
     - Option to add all detected locales or select specific ones
     - Option to add additional locales beyond the auto-detected ones
   - If no auto-detection or no locales found:
     - Shows searchable list of all available locales (excluding source locale)
   - **Smart Display**: For enterprise projects with many locales (>10), uses formatted tables for better readability

5. **Path Discovery**: 
   - Automatically searches for existing internationalization files in your project
   - If files are found, presents them as selectable options
   - If no files are found, prompts for manual path input with validation

6. **API Credentials Setup** (if not already configured):
   - Prompts to add API credentials to `.env` file
   - Option to skip and configure later

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

## Target Locale Auto-Detection

One of the most powerful features of the init command is **automatic target locale detection**. This feature scans your project directory for existing locale files and automatically identifies target locales, saving you time and reducing manual configuration.

### How It Works

1. **Project Scanning**: The CLI searches through your project directories for files that match common internationalization patterns
2. **Locale Extraction**: Identifies locale codes from:
   - Directory names (e.g., `/locales/es/`, `/i18n/fr/`)
   - File names (e.g., `es.json`, `fr-CA.json`)
3. **Smart Filtering**: Automatically excludes the source locale from detected targets
4. **User Confirmation**: Presents the detected locales for your review and selection

### Benefits

- **Time Saving**: No need to manually type or select from a long list of locales
- **Accuracy**: Reduces human error by reading directly from your existing file structure
- **Flexibility**: You can choose to accept all detected locales or select specific ones
- **Extensibility**: Option to add additional locales beyond what was auto-detected

### Example Workflow

```bash
? Automatically detect target locales? Yes
⠙ Searching for target locales...
✔ Found 3 target locale(s): es, fr, it

? Add all 3 detected locales to the target list? 
  (No to choose specific locales) Yes

? Add more target locales? (Already added: es, fr, it) Yes

? Select additional target locales (3 already added)
  › ◉ de
    ◉ pt
    ◯ ja

ℹ Target locales selected: es, fr, it, de, pt (3 auto-detected, 2 manually added)
```

### Enterprise-Scale Support

For projects with many locales (>10), the CLI uses **formatted table displays** for better readability:

```bash
✔ Found 24 target locale(s)

Detected locales:
  es      fr      it      de      
  pt      nl      pl      ru      
  ja      zh      ko      ar      
  hi      th      vi      id      
  tr      uk      cs      sk      
  hr      ro      bg      hu      

? Add all 24 detected locales to the target list? Yes
```

This ensures that even enterprise projects with extensive localization needs remain manageable and easy to configure.

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

### `-r`, `--reset-credentials`
- **Type**: Boolean
- **Default**: `false`
- **Description**: Prompts to reset or update your Lara API credentials in the `.env` file
- **Behavior**: 
  - Only works in interactive mode (ignored if `--non-interactive` is used)
  - Prompts for confirmation before resetting credentials
  - Asks for new API Key and API Secret
  - Updates existing credentials in `.env` file or creates the file if it doesn't exist
  - Preserves other environment variables in the `.env` file
- **Use Cases**:
  - Your API keys have expired
  - You need to switch to different API credentials
  - Your credentials were compromised and need updating
- **example**: `lara-cli init --reset-credentials`

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

### Reset API Credentials

```bash
# Reset or update your API credentials
lara-cli init --reset-credentials
```

This is useful when:
- Your API keys have expired and you received a 401 authentication error
- You need to switch to different API credentials
- Your credentials were compromised and need immediate updating

The command will:
1. Prompt you to confirm the credential reset
2. Ask for your new API Key
3. Ask for your new API Secret  
4. Update the `.env` file (or create it if it doesn't exist)
5. Preserve all other environment variables

### Getting Help

```bash
# Display help for the init command
lara-cli init --help
```

## Need More Help?

- [Translate Command](translate.md) - Next steps after initialization
- [Configuration Reference](lara_yaml.md) - Detailed configuration options