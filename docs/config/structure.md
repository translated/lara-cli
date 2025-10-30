---
title: Configuration Schema
sidebar_position: 2
---

# Configuration Schema

This page explains the schema structure of the `lara.yaml` configuration file and how its sections relate to each other.

## Schema Overview

The `lara.yaml` file follows a hierarchical structure with these main components:

```
lara.yaml
├── version         # Schema version
├── project         # Project-wide settings
├── locales         # Language settings
├── memories        # Translation memory settings
├── glossaries      # Terminology settings
└── files           # File path and processing rules
```

## Complete Schema Example

Below is a complete example showing all possible configuration sections:

```yaml
# Schema version for backward compatibility
version: "1.0.0"

# Project-wide settings
project:
  instruction: "Medical app for professionals. Use formal tone."

# Language configuration
locales:
  source: en
  target:
    - es
    - fr
    - de

# Translation memory configuration
memories:
  - mem_abc123
  - mem_def456

# Glossary configuration
glossaries:
  - gls_xyz789
  - gls_uvw012

# File path and processing rules
files:
  json:
    include:
      - "src/i18n/[locale]/common.json"
      - "src/i18n/[locale]/pages.json"
    exclude:
      - "**/draft/**"
    lockedKeys:
      - "**/id"
      - "config/*/url"
    ignoredKeys:
      - "internal/**"
    fileInstructions:
      - path: "src/i18n/[locale]/common.json"
        instruction: "Common UI elements"
        keyInstructions:
          - path: "buttons/*"
            instruction: "Keep short, max 20 chars"
    keyInstructions:
      - path: "**/error"
        instruction: "Error messages, use formal tone"
```

## Schema Relations

The diagram below shows how the different configuration sections relate to each other:

```
┌─────────────────────┐     ┌────────────────────┐
│ project.instruction │     │ locales            │
│ (global context)    │     │ (language settings)│
└─────────────────────┘     └────────────────────┘
          │                           │
          ▼                           ▼
┌─────────────────────────────────────────────────┐
│                                                 │
│             translation process                 │
│                                                 │
└─────────────────────────────────────────────────┘
          ▲                           ▲
          │                           │
┌─────────────────┐           ┌───────────────────┐
│ memories        │           │ files             │
│ glossaries      │           │ (paths & rules)   │
│ (terminology)   │           │                   │
└─────────────────┘           └───────────────────┘
```

## Configuration Inheritance

Configuration settings follow a specific inheritance pattern:

1. **Project level** settings apply to all files and keys
2. **File level** settings override project settings for specific files
3. **Key level** settings override file settings for specific keys

This allows for progressive refinement of translation instructions and rules.

## Related Topics

Each section of the configuration has its own detailed documentation:

- [Locales Configuration](./locales.md)
- [Files Configuration](./files.md)
- [Instructions Configuration](./instructions.md)
- [Translation Memories Configuration](./memories.md)
- [Glossaries Configuration](./glossaries.md)