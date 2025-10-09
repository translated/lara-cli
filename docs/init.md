# Init Command

The `init` command initializes a new Lara project by creating a configuration file ([lara.yaml](lara_yaml.md)) that defines the localization settings for your project. This is the first step to set up internationalization in your application.

## Overview

The init command helps you configure your project for translation by creating a `lara.yaml` file in your project's root directory. This file contains all necessary settings for Lara CLI to manage your internationalization files, including:

- Source and target locales
- File paths to watch
- Translation rules and exclusions
- Project instruction (optional) for improved translation quality

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

6. **Project Instruction** (optional):
   - If an instruction already exists in your configuration, it will be preserved automatically
   - If no instruction exists, you'll be prompted to provide project instruction to improve translation quality
   - Instructions can specify tone (formal, casual), domain-specific terminology, or style requirements
   - Providing instructions helps the translation service deliver better, more appropriate translations

7. **Translation Memories** (optional):
   - If Translation Memories are already configured, you'll be asked if you want to update them
   - If none are configured, you'll be asked if you want to use Translation Memories
   - Shows a searchable list of all available Translation Memories from your account
   - Allows selection of multiple Translation Memories to personalize translations
   - Translation Memories enable Lara to adapt to your style and terminology using past translation examples
   - Available for Team and Enterprise subscriptions only

8. **Glossaries** (optional):
   - If Glossaries are already configured, you'll be asked if you want to update them
   - If none are configured, you'll be asked if you want to use Glossaries
   - Shows a searchable list of all available Glossaries from your account
   - Allows selection of multiple Glossaries to control domain-specific terminology
   - Glossaries ensure precise and consistent translation of technical terms, brand names, and industry-specific vocabulary
   - Available for Pro and Team subscriptions only

9. **API Credentials Setup** (if not already configured):
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
project:
  instruction: "Medical application for healthcare professionals. Use formal tone and medical terminology."
locales:
  source: en
  target:
    - es
    - it
memories:
  - mem_abc123
  - mem_def456
glossaries:
  - gls_xyz789
  - gls_uvw012
files:
  json:
    include:
      - "./src/i18n/en.json"
    exclude: []
    lockedKeys: []
    ignoredKeys: []
```

By default, `locales.source`, `locales.target` and `files.json.include` properties will be populated with your selected data. The `project.instruction` property is optional but recommended for better translation quality. The `memories` property allows you to specify Translation Memories for domain adaptation. The `glossaries` property allows you to specify Glossaries for terminology control. There are additional properties you can configure later.

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
? Automatically detect and add target locales? Yes
⠙ Searching for target locales...
✔ Found 3 target locales: es, fr, it

? Do you want to add more target locales? (3 locales already added) Yes

? Select additional target locales
(Type to search, ↑/↓ navigate, Space select, Ctrl+A toggle all)
  › ◯ de
    ◉ pt
    ◯ ja

ℹ Selected additional target locales: ko, nb, pl
```

### Enterprise-Scale Support

For projects with many locales (>10), the CLI uses **formatted table displays** for better readability:

```bash
✔ Found 24 target locales

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

### `-i <instruction>`, `--instruction <instruction>`
- **Type**: String
- **Description**: Provides project instruction to improve translation quality and accuracy
- **Purpose**: Helps the translation service understand the desired tone, style, and terminology for your translations
- **Behavior**:
  - **If instruction already exists** in your configuration: The new instruction provided via this option will replace the existing one
  - **If no instruction exists**: The provided instruction will be saved to the configuration
  - **In interactive mode without this option**: If no instruction exists, you'll be prompted to provide one
  - **In non-interactive mode without this option**: If an instruction already exists in the configuration, it will be preserved
- **What to include**:
  - Tone requirements (formal, casual, professional, friendly)
  - Domain-specific terminology (medical, legal, technical, etc.)
  - Style preferences (concise, detailed, creative)
  - Target audience considerations
- **Examples**:
  - `--instruction "Medical application for healthcare professionals. Use formal tone and medical terminology."`
  - `--instruction "Use elegant and sophisticated language."`
  - `--instruction "Use simple, friendly language for children."`
  - `--instruction "Use professional business terminology and be concise."`

### `-m <translation-memories>`, `--translation-memories <translation-memories>`
- **Type**: String (comma/space-separated Translation Memory IDs)
- **Description**: Specifies Translation Memory IDs to use for domain adaptation during translations
- **Purpose**: Enables Lara to adapt translations to your specific style and terminology using past translation examples
- **Format**: Memory IDs can be separated by commas, spaces, or both (e.g., `"mem_abc123, mem_def456"` or `"mem_abc123 mem_def456"`)
- **Behavior**:
  - **In interactive mode**: You'll be prompted to select Translation Memories from your account if this option is not provided
  - **In non-interactive mode**: Memories specified via this option will be saved to the configuration
  - **If memories already exist** in your configuration: Providing new memory IDs will replace the existing ones
- **Requirements**:
  - Available for **Team and Enterprise subscriptions only**
  - Memory IDs must belong to your Lara account
  - Memory IDs typically start with `mem_`
- **How to find Memory IDs**:
  - Run `lara-cli memory` to list available Translation Memories
  - Check the Lara platform dashboard
  - Contact Lara support for assistance
- **Use Cases**:
  - Maintain consistency with past translations
  - Preserve domain-specific terminology (legal, medical, technical)
  - Apply brand voice and style consistently
  - Fix recurring translation errors instantly
- **Examples**:
  - `--translation-memories "mem_abc123, mem_def456"`
  - `--translation-memories "mem_legal_en_es"`
  - `-m "mem_123 mem_456 mem_789"`
- **Related Commands**:
  - Run `lara-cli memory` to view all available Translation Memories
  - See [Memory Command Documentation](memory.md) for details

### `-g <glossaries>`, `--glossaries <glossaries>`
- **Type**: String (comma/space-separated Glossary IDs)
- **Description**: Specifies Glossary IDs to use for precise terminology control during translations
- **Purpose**: Ensures consistent and accurate translation of domain-specific terms, brand names, and technical vocabulary
- **Format**: Glossary IDs can be separated by commas, spaces, or both (e.g., `"gls_abc123, gls_def456"` or `"gls_abc123 gls_def456"`)
- **Behavior**:
  - **In interactive mode**: You'll be prompted to select Glossaries from your account if this option is not provided
  - **In non-interactive mode**: Glossaries specified via this option will be saved to the configuration
  - **If glossaries already exist** in your configuration: Providing new glossary IDs will replace the existing ones
- **Requirements**:
  - Available for **Pro and Team subscriptions only**
  - Glossary IDs must belong to your Lara account
  - Glossary IDs typically start with `gls_`
- **How to find Glossary IDs**:
  - Run `lara-cli glossary` to list available Glossaries
  - Check the Lara platform dashboard
  - Contact Lara support for assistance
- **Use Cases**:
  - Ensure precise translation of technical terms
  - Maintain consistency for product names and brand terminology
  - Control legal and medical terminology
  - Preserve industry-specific vocabulary
- **Examples**:
  - `--glossaries "gls_abc123, gls_def456"`
  - `--glossaries "gls_legal_terms"`
  - `-g "gls_123 gls_456 gls_789"`
- **Related Commands**:
  - Run `lara-cli glossary` to view all available Glossaries
  - See [Glossary Command Documentation](glossary.md) for details

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

### Providing Project Instructions

```bash
# Initialize with project instruction (interactive mode)
lara-cli init --instruction "This is a medical application for healthcare professionals. Use formal tone and medical terminology."

# Initialize with instruction in non-interactive mode
lara-cli init --source "en" --target "es, fr" --paths "src/i18n/[locale].json" --instruction "Use elegant and sophisticated language." --non-interactive

# Update existing instruction
lara-cli init --instruction "Use professional business terminology and be concise" --force
```

**Instruction handling behavior:**
- **First initialization**: Instruction is saved to your `lara.yaml` configuration
- **Re-initialization without `--instruction`**: Existing instruction is automatically preserved
- **Re-initialization with `--instruction`**: New instruction replaces the existing one
- **Interactive mode without `--instruction`**: You'll be prompted to provide instruction if none exists

**Best practices for writing instructions:**
- Specify the desired tone (e.g., "formal", "casual", "friendly", "professional")
- Mention domain-specific terminology requirements (e.g., "medical terminology", "legal terms")
- Include style preferences (e.g., "concise", "detailed", "creative")
- Consider your target audience (e.g., "for professionals", "for children")
- Keep it clear and focused (1-2 sentences is usually sufficient)

### Using Translation Memories

```bash
# List available Translation Memories first
lara-cli memory

# Initialize with specific Translation Memories (interactive mode)
lara-cli init --translation-memories "mem_abc123, mem_def456"

# Initialize with Translation Memories in non-interactive mode
lara-cli init --source "en" --target "es, fr" \
  --paths "src/i18n/[locale].json" \
  --translation-memories "mem_legal_123, mem_medical_456" \
  --non-interactive

# Update Translation Memories in existing configuration
lara-cli init --translation-memories "mem_new_123" --force
```

**Translation Memory behavior:**
- **First initialization**: Selected memories are saved to your `lara.yaml` configuration
- **Re-initialization without `--translation-memories`**: Existing memories are automatically preserved
- **Re-initialization with `--translation-memories`**: New memory IDs replace the existing ones
- **Interactive mode without `--translation-memories`**: You'll be prompted to select memories if none exist

**Best practices for using Translation Memories:**
- Use separate memories for different domains (legal, medical, technical)
- Combine multiple memories for comprehensive terminology coverage
- Keep memories updated with quality-vetted translation examples
- Use complete locale codes (e.g., `pt-PT` not `pt`) when populating memories
- Run `lara-cli memory` regularly to verify available memories
- Contact Lara support for professional domain adaptation services

**Translation Memories vs. Instructions:**
- **Translation Memories**: Adapt using concrete past translation examples (sentence pairs)
- **Instructions**: Guide translation with natural language directives (tone, style, requirements)
- **Best approach**: Use both together for optimal translation quality
  - Instructions define the general style and requirements
  - Translation Memories provide specific terminology and phrasing examples

For more information about Translation Memories, see:
- [Memory Command Documentation](memory.md)
- [Official Translation Memory Documentation](https://developers.laratranslate.com/docs/adapt-to-translation-memories)

### Using Glossaries

```bash
# List available Glossaries first
lara-cli glossary

# Initialize with specific Glossaries (interactive mode)
lara-cli init --glossaries "gls_abc123, gls_def456"

# Initialize with Glossaries in non-interactive mode
lara-cli init --source "en" --target "es, fr" \
  --paths "src/i18n/[locale].json" \
  --glossaries "gls_legal_123, gls_medical_456" \
  --non-interactive

# Update Glossaries in existing configuration
lara-cli init --glossaries "gls_new_123" --force
```

**Glossary behavior:**
- **First initialization**: Selected glossaries are saved to your `lara.yaml` configuration
- **Re-initialization without `--glossaries`**: Existing glossaries are automatically preserved
- **Re-initialization with `--glossaries`**: New glossary IDs replace the existing ones
- **Interactive mode without `--glossaries`**: You'll be prompted to select glossaries if none exist

**Best practices for using Glossaries:**
- Use separate glossaries for different domains (legal, medical, technical)
- Combine multiple glossaries for comprehensive terminology coverage
- Keep glossaries updated with accurate term translations
- Use complete locale codes (e.g., `en-US` not `en`) when populating glossaries
- Run `lara-cli glossary` regularly to verify available glossaries
- Use the Lara platform or SDK for full glossary management

**Glossaries vs. Translation Memories vs. Instructions:**
- **Glossaries**: Exact term-to-term translations (e.g., "API" → "API", "Database" → "Base de datos")
- **Translation Memories**: Sentence-level adaptation using past translation examples
- **Instructions**: Natural language directives about tone, style, and domain context
- **Best approach**: Use all three together for optimal translation quality
  - Glossaries ensure critical terms are always translated correctly
  - Translation Memories adapt overall style and phrasing
  - Instructions guide tone, formality, and context

For more information about Glossaries, see:
- [Glossary Command Documentation](glossary.md)
- [Official Glossary Documentation](https://developers.laratranslate.com/docs/manage-glossaries)

### Getting Help

```bash
# Display help for the init command
lara-cli init --help
```

## Need More Help?

- [Memory Command](memory.md) - Manage Translation Memories
- [Glossary Command](glossary.md) - Manage Glossaries
- [Translate Command](translate.md) - Next steps after initialization
- [Configuration Reference](lara_yaml.md) - Detailed configuration options