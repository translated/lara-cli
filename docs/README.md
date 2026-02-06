# Lara CLI Documentation

Welcome to the Lara CLI documentation. This guide will help you set up and use Lara CLI to manage your application's internationalization.

## Overview

Lara CLI is a command-line tool that simplifies the management of your application's internationalization (i18n) files. It automates translation of your i18n JSON files with a single command, preserving structure and formatting while integrating with a professional translation API.

## Getting Started

To get started with Lara CLI, follow these steps:

1. **Set up your project**: Configure your environment with API credentials
2. **Initialize your project**: Run `lara-cli init` to create a configuration file
3. **Translate your files**: Run `lara-cli translate` to process translations

## Command Reference

Lara CLI provides several commands to manage your internationalization:

- [Init Command](commands/init.md) - Initialize your project
- [Translate Command](commands/translate.md) - Translate your files
- [Memory Command](commands/memory.md) - List available Translation Memories
- [Glossary Command](commands/glossary.md) - List available Glossaries

## Configuration Reference

The `lara.yaml` configuration file controls how Lara CLI works with your project:

- [Configuration Overview](config/README.md) - Configuration system overview
- [Supported Formats](config/formats.md) - Supported file formats (JSON, PO, etc.)
- [Locales Configuration](config/locales.md) - Configure source and target languages
- [Files Configuration](config/files.md) - Configure file paths and patterns
- [File Structure and Formats](config/supported_formats.md) - Supported file formats and JSON structure
- [Instructions](config/instructions.md) - Configure translation instructions
- [Translation Memories](config/memories.md) - Configure Translation Memories
- [Glossaries](config/glossaries.md) - Configure Glossaries

## Format-Specific Guides

- [JSON Files Guide](config/files/json-files.md) - Complete guide for JSON files
- [TS Files Guide](config/files/ts-files.md) - Complete guide for TypeScript files
- [PO Files Guide](config/files/po-files.md) - Complete guide for gettext PO files
- [Vue Files Guide](config/files/vue-files.md) - Complete guide for Vue I18n single-file components
- [Markdown Files Guide](config/files/md-files.md) - Complete guide for Markdown and MDX files
- [Android XML Files Guide](config/files/android-xml-files.md) - Complete guide for Android XML string resource files
