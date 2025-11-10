# Lara Configuration Overview

Lara Dev uses a configuration file (`lara.yaml`) to define your internationalization settings. This file is created when you run `lara-dev init` and defines how translations are handled in your project.

## Configuration File Location

The `lara.yaml` file should be placed in the root directory of your project.

## Basic Structure

```yaml
version: "1.0.0"
project:
  instruction: "Project-wide translation instruction"
locales:
  source: en
  target:
    - es
    - fr
memories:
  - mem_abc123
glossaries:
  - gls_xyz789
files:
  json:
    include:
      - "src/i18n/[locale].json"
    exclude: []
    lockedKeys: []
    ignoredKeys: []
```

## Configuration Sections

The configuration is divided into several sections:

- **[Configuration Schema](./structure.md)** - Schema structure and organization of the configuration file
- **[Locales](./locales.md)** - Source and target language configuration
- **[Files](./files.md)** - File paths and exclusion patterns
- **[File Structure and Formats](./file-structure.md)** - Supported file formats, JSON structure, and file discovery
- **[Instructions](./instructions.md)** - Project, file, and key-level translation instructions
- **[Translation Memories](./memories.md)** - Memory configuration for domain adaptation
- **[Glossaries](./glossaries.md)** - Glossary configuration for terminology control

## Creating Configuration

The simplest way to create a `lara.yaml` file is to run the [init command](../commands/init.md):

```bash
lara-dev init
```

This will guide you through creating your configuration interactively, or you can use command-line options for a non-interactive setup.
