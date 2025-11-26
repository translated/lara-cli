<div align="center">

# 🚀 Lara Dev – A Powerful CLI Tool for Instant i18n Localization

Lara Dev automates translation of your i18n files with a single command, preserving structure and formatting while integrating with a professional translation API. Given a source language, it translates your content to selected target languages based on your source i18n files.

Supports multiple file formats including JSON and PO (gettext). See [Supported Formats](docs/config/formats.md) for details.

[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](https://github.com/translated/lara-dev)

</div>

> **⚠️ Development Mode Only:** This tool is currently available in development mode. The full release is coming soon! 🚀

## 📑 Table of Contents

- [Requirements](#requirements)
- [Local Development Setup](#local-development-setup)
- [Setting Up Your Project](#setting-up-your-project)
- [Technology Stack](#technology-stack)
- [Supported Locales](#supported-locales)
- [Documentation](#documentation)

## Requirements

- Node.js v18 or higher
- pnpm v8 or higher

## Local Development Setup

1. **Clone the repository**

```bash
git clone https://github.com/translated/lara-dev.git
```

2. **Navigate to the cloned repository**

```bash
cd lara-dev
```

3. **Install dependencies and build**

> **Note:** This project uses pnpm. If you don't have it installed, run: `npm install -g pnpm`. Verify the installation with `pnpm -v` before proceeding with the following commands.

```bash
pnpm install
pnpm run build
```

4. **Setup pnpm global bin directory (first time only)**

```bash
pnpm setup
```

This command configures your shell to add the pnpm global bin directory to your PATH. After running it, you'll see output similar to:

```bash
Appended new lines to /Users/<username>/.zshrc

Next configuration changes were made:
export PNPM_HOME="/Users/<username>/Library/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac
```

Add these lines to your shell profile (`.zshrc`, `.bashrc`, etc.) or restart your terminal to apply the changes. This ensures you can run globally installed pnpm packages.

5. **Link globally**

```bash
pnpm link --global
```

> **Note:** If you experience an error like `ERR_PNPM_NO_GLOBAL_BIN_DIR`, you may need to manually copy and paste the lines added by `pnpm setup` into your shell profile. After doing so, restart your terminal or source your profile file, and you should be able to proceed.

After running this command, the project will be successfully linked to the pnpm global library. You should see a response similar to:

```bash
/Users/username/Library/pnpm/global/5:
+ lara-dev version <- ../../../../Projects/translated/lara-dev
```

6. **Installation Complete - Use anywhere**

Now that Lara Dev is installed globally, you can use it from any directory on your system:

```bash
# Get help with available commands
lara-dev --help

# Initialize a new Lara project
lara-dev init --help

# Translate your localization files
lara-dev translate --help
```

**Note:** After making changes to the source code, run `pnpm run build` to update the global command.

## Setting Up Your Project

### Add Your Credentials to `.env`

Create a `.env` file (or add the following lines to an existing `.env`) in the project where you want to run translations.

💡 **Tip:** If you don't have API keys yet, visit [Lara's API key documentation](https://support.laratranslate.com/en/api-key-for-laras-api).


```bash
LARA_ACCESS_KEY_ID=<YOUR_ACCESS_KEY_ID>
LARA_ACCESS_KEY_SECRET=<YOUR_ACCESS_KEY_SECRET>
```

Replace the placeholders with your **actual credentials**.

> **🔑 Need to update credentials?** If your API keys expire or need updating, run `lara-dev init --reset-credentials` to safely update them in your `.env` file.

### Initialize Your Project

In your project directory, run:

```bash
lara-dev init
```

This will start the interactive initialization process.

The CLI will **automatically detect your localization directories and target locales** from your existing project files, then guide you through a few questions. These will be used to generate the configuration file: `lara.yaml`.

**Key features:**

- 🔍 **Auto-detection**: Scans your project for existing locale files and automatically suggests target locales
- 📊 **Smart display**: For enterprise projects with many locales, uses formatted tables for better readability
- ⚙️ **Flexible configuration**: Choose detected locales or manually add/remove as needed
- 🎯 **Project instructions**: Optionally provide instructions to improve translation quality (e.g., tone, style, terminology)

**Providing project instructions** (optional but recommended):

During initialization, you can provide instructions to help improve translation quality. Instructions guide the translation service on tone, style, and terminology. This is especially useful for:

- Tone requirements (formal, casual, professional, friendly)
- Domain-specific terminology (medical, legal, technical, etc.)
- Style preferences (concise, creative, detailed)

**Providing glossaries** (optional but recommended):

Lara's glossary system lets you define exactly how specific terms should be translated, across any text or document. Whether you work with technical terms, product names, or recurring brand phrases, glossaries are your best tool to ensure consistency and precision.

💡 **Tip:** For more information about glossaries, visit [Lara's Glossary documentation](https://support.laratranslate.com/en/how-glossaries-work-in-lara).

### Translate Your Files!

To translate your files into the target locales, run:

```bash
lara-dev translate
```

That's it – you're ready to go!

> **📖 Documentation:** For detailed information about commands, see [Init Command](docs/commands/init.md) and [Translate Command](docs/commands/translate.md).


## Technology Stack

Lara Dev is built with modern technologies to ensure reliability, performance, and maintainability:

- **TypeScript** - For type safety and developer experience
- **Commander.js** - For CLI argument parsing and command structure
- **Zod** - For robust schema validation
- **Inquirer.js** - For interactive command-line user interfaces
- **Lara Translation API** - For high-quality, context-aware translations

The codebase follows a modular architecture with clear separation of concerns, making it easy to extend and maintain.

## Supported Locales

Lara Dev supports translations using different locale codes, following two main standards:

See the [full list of supported locales](docs/config/locales.md#supported-locales).

## Documentation

For detailed documentation on using Lara Dev:

### Commands
- [Init Command](docs/commands/init.md) - Initialize your project
- [Translate Command](docs/commands/translate.md) - Translate your files
- [Memory Command](docs/commands/memory.md) - List available Translation Memories
- [Glossary Command](docs/commands/glossary.md) - List available Glossaries

### Configuration
- [Configuration Overview](docs/config/README.md) - Configuration system overview
- [Supported Formats](docs/config/formats.md) - Supported file formats (JSON, PO, etc.)
- [Locales Configuration](docs/config/locales.md) - Configure source and target languages
- [Files Configuration](docs/config/files.md) - Configure file paths and patterns
- [Instructions](docs/config/instructions.md) - Configure translation instructions
- [Translation Memories](docs/config/memories.md) - Configure Translation Memories
- [Glossaries](docs/config/glossaries.md) - Configure Glossaries

### Format-Specific Guides
- [PO Files Guide](docs/config/po-files.md) - Complete guide for gettext PO files