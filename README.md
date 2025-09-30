<div align="center">

# 🚀 Lara CLI – A Powerful CLI Tool for Instant i18n Localization

Lara CLI automates translation of your i18n JSON files with a single command, preserving structure and formatting while integrating with a professional translation API. Given a source language, it translates your content to selected target languages based on your source i18n JSON files.

[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](https://github.com/humanstech/lara-cli)

</div>

> **⚠️ Development Mode Only:** This tool is currently in active development. A full release is coming soon! 🚀


## 📑 Table of Contents

- [Requirements](#requirements)
- [Setting Up Your Project](#setting-up-your-project)
- [Local Development Setup](#local-development-setup)
- [How Lara CLI Works Under the Hood](#how-lara-cli-works-under-the-hood)
- [Technology Stack](#technology-stack)
- [Supported Locales](#supported-locales)
- [Documentation](#documentation)


## Requirements

- Node.js v18 or higher
- pnpm v8 or higher


## 📝 Setting Up Your Project

### Add Your Credentials to `.env`

Create a `.env` file (or add the following lines to an existing `.env`) in the project where you want to run translations.

💡 **Tip:** If you don't have API keys yet, visit [Lara's API key documentation](https://support.laratranslate.com/en/api-key-for-laras-api).


```bash
LARA_ACCESS_KEY_ID=<YOUR_ACCESS_KEY_ID>
LARA_ACCESS_KEY_SECRET=<YOUR_ACCESS_KEY_SECRET>
```

Replace the placeholders with your **actual credentials**.

> **🔑 Need to update credentials?** If your API keys expire or need updating, run `lara-cli init --reset-credentials` to safely update them in your `.env` file.

### Initialize Your Project

In your project directory, run:

```bash
lara-cli init
```

This will start the interactive initialization process.

The CLI will **automatically detect your localization directories and target locales** from your existing project files, then guide you through a few questions. These will be used to generate the configuration file: `lara.yaml`.

**Key features:**
- 🔍 **Auto-detection**: Scans your project for existing locale files and automatically suggests target locales
- 📊 **Smart display**: For enterprise projects with many locales, uses formatted tables for better readability
- ⚙️ **Flexible configuration**: Choose detected locales or manually add/remove as needed

### Translate Your Files!

To translate your files into the target locales, run:

```bash
lara-cli translate
```

That's it – you're ready to go!

> **📖 Documentation:** For detailed information about commands, see [Init Command](docs/init.md) and [Translate Command](docs/translate.md).


## 🖥️ Local Development Setup

1. **Clone the repository**

```bash
git clone https://github.com/humanstech/lara-cli.git
```

2. **Navigate to the cloned repository**

```bash
cd lara-cli
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
+ lara-cli version <- ../../../../Projects/translated/lara-cli
```

6. **Installation Complete - Use anywhere**

Now that Lara CLI is installed globally, you can use it from any directory on your system:

```bash
# Get help with available commands
lara-cli --help

# Initialize a new Lara project
lara-cli init --help

# Translate your localization files
lara-cli translate --help
```

**Note:** After making changes to the source code, run `pnpm run build` to update the global command.


## 🧠 How Lara CLI Works Under the Hood

When you run Lara for the first time, it translates your project while leaving existing translations untouched — unless it detects inconsistencies between the files.

After the initial translation, a `.lara.lock` file is generated to keep track of changes. From that point on, whenever you modify your source locale file and request a new translation, **only the updated keys will be translated**.


## 💻 Technology Stack

Lara CLI is built with modern technologies to ensure reliability, performance, and maintainability:

- **TypeScript** - For type safety and developer experience
- **Commander.js** - For CLI argument parsing and command structure
- **Zod** - For robust schema validation
- **Inquirer.js** - For interactive command-line user interfaces
- **Lara Translation API** - For high-quality, context-aware translations

The codebase follows a modular architecture with clear separation of concerns, making it easy to extend and maintain.


## Supported Locales

Lara CLI supports translations using different locale codes, following two main standards:

### ISO 639-1 Language Codes
These are basic language identifiers (e.g., `en` for English, `fr` for French) that apply to all regions where the language is spoken.

### BCP 47 Language Tags
These are standardized language tags defined by BCP 47, combining ISO 639-1 language codes with ISO 3166-1 country codes (e.g., `en-US` for English in the United States, `fr-CA` for French in Canada). They provide more precise regional context and are often called "locale identifiers".

> **Note:** You can use either ISO 639-1 codes or BCP 47 tags as source and target languages. The translation service will automatically handle the appropriate regional variants.


### Supported Language Codes

#### ISO 639-1 Language Codes

| Code  | Language            | Code  | Language            |
|-------|---------------------|-------|---------------------|
| ar    | Arabic              | de    | German              |
| bg    | Bulgarian           | el    | Greek               |
| ca    | Catalan             | en    | English             |
| cs    | Czech               | es    | Spanish             |
| da    | Danish              | fi    | Finnish             |
| fr    | French              | he    | Hebrew              |
| hr    | Croatian            | hu    | Hungarian           |
| id    | Indonesian          | it    | Italian             |
| ja    | Japanese            | ko    | Korean              |
| ms    | Malay               | nb    | Norwegian Bokmål    |
| nl    | Dutch               | pl    | Polish              |
| pt    | Portuguese          | ru    | Russian             |
| sk    | Slovak              | sv    | Swedish             |
| th    | Thai                | tr    | Turkish             |
| uk    | Ukrainian           | zh    | Chinese             |

#### BCP 47 Language Tags / Locale Identifiers

| Code     | Language & Region                    | Code     | Language & Region                    |
|----------|--------------------------------------|----------|--------------------------------------|
| ar-SA    | Arabic (Saudi Arabia)                | en-AU    | English (Australia)                  |
| bg-BG    | Bulgarian (Bulgaria)                 | en-CA    | English (Canada)                     |
| ca-ES    | Catalan (Spain)                      | en-GB    | English (United Kingdom)             |
| cs-CZ    | Czech (Czech Republic)               | en-IE    | English (Ireland)                    |
| da-DK    | Danish (Denmark)                     | en-US    | English (United States)              |
| de-DE    | German (Germany)                     | es-419   | Spanish (Latin America)              |
| el-GR    | Greek (Greece)                       | es-AR    | Spanish (Argentina)                  |
| fi-FI    | Finnish (Finland)                    | es-ES    | Spanish (Spain)                      |
| fr-CA    | French (Canada)                      | es-MX    | Spanish (Mexico)                     |
| he-IL    | Hebrew (Israel)                      | fr-FR    | French (France)                      |
| hr-HR    | Croatian (Croatia)                   | hu-HU    | Hungarian (Hungary)                  |
| id-ID    | Indonesian (Indonesia)               | it-IT    | Italian (Italy)                      |
| ja-JP    | Japanese (Japan)                     | ko-KR    | Korean (South Korea)                 |
| ms-MY    | Malay (Malaysia)                     | nb-NO    | Norwegian Bokmål (Norway)            |
| nl-BE    | Dutch (Belgium)                      | nl-NL    | Dutch (Netherlands)                  |
| pl-PL    | Polish (Poland)                      | pt-BR    | Portuguese (Brazil)                  |
| pt-PT    | Portuguese (Portugal)                | ru-RU    | Russian (Russia)                     |
| sk-SK    | Slovak (Slovakia)                    | sv-SE    | Swedish (Sweden)                     |
| th-TH    | Thai (Thailand)                      | tr-TR    | Turkish (Turkey)                     |
| uk-UA    | Ukrainian (Ukraine)                  | zh-CN    | Chinese (China)                      |
| zh-HK    | Chinese (Hong Kong)                  | zh-TW    | Chinese (Taiwan)                     |


## Documentation

For detailed documentation on using Lara CLI:

- [Init Command](docs/init.md) - How to initialize your project
- [Translate Command](docs/translate.md) - How to translate your files
- [Lara.yaml Configuration](docs/lara_yaml.md) - Complete configuration reference
