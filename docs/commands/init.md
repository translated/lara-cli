---
title: Init Command
sidebar_position: 1
---

# Init Command

The `init` command initializes a new Lara project by creating a configuration file (`lara.yaml`) that defines localization settings for your project.

## Usage

```bash
lara-cli init [options]
```

## Options

| Option | Description |
|--------|-------------|
| `-y, --non-interactive` | Run in non-interactive mode using provided options |
| `-f, --force` | Overwrite an existing configuration file without confirmation |
| `-s, --source <locale>` | Set source locale (default: `en`) |
| `-t, --target <locales>` | Set comma-separated target locales |
| `-p, --paths <paths>` | Set comma-separated file paths to watch (must include `[locale]` placeholder) |
| `-r, --reset-credentials` | Reset or update your Lara API credentials |
| `-i, --instruction <instruction>` | Set project instruction for translation quality |
| `-m, --translation-memories <memories>` | Set comma-separated Translation Memory IDs |
| `-g, --glossaries <glossaries>` | Set comma-separated Glossary IDs |
| `-h, --help` | Display help information |

## Operating Modes

### Interactive Mode (Default)

Running without `--non-interactive` prompts for information:

```bash
lara-cli init
```

The command guides you through:
- Source locale selection
- Target locales detection and selection
- Translation file path configuration
- Project instructions (optional)
- Translation Memories configuration (optional)
- Glossaries configuration (optional)
- API credentials setup (if needed)

### Non-Interactive Mode

Generates configuration file using provided options:

```bash
lara-cli init --source "en" --target "es, fr" --paths "./src/i18n/[locale].json" --force --non-interactive
```

## Examples

### Basic Interactive Initialization

```bash
lara-cli init
```

### Force Overwrite Existing Configuration

```bash
lara-cli init --force
```

### Specify Source and Target Languages

```bash
lara-cli init --source "es" --target "en, fr"
```

### Custom Path Configuration

```bash
lara-cli init --paths "src/locales/[locale]/messages.json, public/i18n/[locale].json"
```

### Complete Non-Interactive Setup

```bash
lara-cli init --source "en" --target "de, fr, it" \
  --paths "src/i18n/[locale]/common.json" \
  --instruction "E-commerce app, formal tone" \
  --force --non-interactive
```

### Reset API Credentials

```bash
lara-cli init --reset-credentials
```

## Related

- [Configuration Reference](../config/README.md)
- [Translate Command](./translate.md)
- [Memory Command](./memory.md) 
- [Glossary Command](./glossary.md)