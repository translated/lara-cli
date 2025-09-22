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

### Initialize Your Project

In your project directory, run:

```bash
lara-cli init
```

This will start the interactive initialization process.

The CLI will **automatically detect your localization directories** and guide you through a few questions. These will be used to generate the configuration file: `lara.yaml`.

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

Lara CLI supports the following locale codes as both source and target languages for translation. You can specify any of these locales in your configuration to translate content between them.

| Code  | Language            | Code   | Language             |
|-------|---------------------|--------|----------------------|
| ar    | Arabic              | nb     | Norwegian Bokmål     |
| ca    | Catalan             | pl     | Polish               |
| da    | Danish              | pt     | Portuguese           |
| de    | German              | pt-BR  | Portuguese (Brazil)  |
| el    | Greek               | ru     | Russian              |
| en    | English             | sk     | Slovak               |
| es    | Spanish             | sv     | Swedish              |
| fi    | Finnish             | th     | Thai                 |
| fr    | French              | tr     | Turkish              |
| he    | Hebrew              | uk     | Ukrainian            |
| hr    | Croatian            | zh     | Chinese              |
| hu    | Hungarian           | zh-CN  | Chinese (China)      |
| id    | Indonesian          | zh-TW  | Chinese (Taiwan)     |
| it    | Italian             | bg     | Bulgarian            |
| ja    | Japanese            | cs     | Czech                |
| ko    | Korean              | ms     | Malay                |
| nl    | Dutch               |


## Documentation

For detailed documentation on using Lara CLI:

- [Init Command](docs/init.md) - How to initialize your project
- [Translate Command](docs/translate.md) - How to translate your files
- [Lara.yaml Configuration](docs/lara_yaml.md) - Complete configuration reference
