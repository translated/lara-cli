# Lara Dev Documentation

Welcome to the Lara Dev documentation. This guide will help you set up and use Lara Dev to manage your application's internationalization.

## Overview

Lara Dev is a command-line tool that simplifies the management of your application's internationalization (i18n) files. It automates translation of your i18n JSON files with a single command, preserving structure and formatting while integrating with a professional translation API.

## Getting Started

To get started with Lara Dev, follow these steps:

1. **Set up your project**: Configure your environment with API credentials
2. **Initialize your project**: Run `lara-dev init` to create a configuration file
3. **Translate your files**: Run `lara-dev translate` to process translations

## Command Reference

Lara Dev provides several commands to manage your internationalization:

- [Init Command](commands/init.md) - Initialize your project
- [Translate Command](commands/translate.md) - Translate your files
- [Memory Command](commands/memory.md) - List available Translation Memories
- [Glossary Command](commands/glossary.md) - List available Glossaries

## Configuration Reference

The `lara.yaml` configuration file controls how Lara Dev works with your project:

- [Configuration Overview](config/README.md) - Configuration system overview
- [Supported Formats](config/formats.md) - Supported file formats (JSON, PO, etc.)
- [Locales Configuration](config/locales.md) - Configure source and target languages
- [Files Configuration](config/files.md) - Configure file paths and patterns
- [Instructions](config/instructions.md) - Configure translation instructions
- [Translation Memories](config/memories.md) - Configure Translation Memories
- [Glossaries](config/glossaries.md) - Configure Glossaries

## Format-Specific Guides

- [PO Files Guide](config/po-files.md) - Complete guide for gettext PO files
