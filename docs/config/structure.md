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
├── noTrace         # No-trace mode (prevents server-side storage)
├── translation     # Translation tuning (batch size, orphan key handling)
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

# No-trace mode — prevents server-side storage of translated content
noTrace: false

# Translation tuning
translation:
  batchSize: 50       # Max keys sent per translation request (default: 50)
  orphanKeys: keep    # What to do with target-only keys: keep | delete (default: keep)

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
│ noTrace         │           │                   │
│ (terminology &  │           │                   │
│  privacy)       │           │                   │
└─────────────────┘           └───────────────────┘
```

## Configuration Inheritance

Configuration settings follow a specific inheritance pattern:

1. **Project level** settings apply to all files and keys
2. **File level** settings override project settings for specific files
3. **Key level** settings override file settings for specific keys

This allows for progressive refinement of translation instructions and rules.

## Translation Batching

When a single file contains multiple translatable keys, Lara CLI sends them together in a single API request instead of one request per key. This reduces round trips and makes translation noticeably faster on large files.

```yaml
translation:
  batchSize: 50
```

- Keys that share a file- or project-level instruction (or no instruction at all) are grouped into batches of at most `batchSize` items.
- Keys that match a per-key instruction (`fileInstructions[*].keyInstructions` or `keyInstructions`) are translated individually so each keeps its own instruction.
- If a batch request fails after retries, the engine automatically falls back to translating each key in that batch one by one, so a single problematic string cannot block the rest of the file.
- `batchSize` defaults to `50` when the `translation` section is omitted. Existing `lara.yaml` files continue to work without changes.

## Orphan Keys

An **orphan key** is a key that exists in a target locale file but not in the source file. They usually appear when a translator adds a locale-specific entry by hand, or when a key is renamed in one place only.

```yaml
translation:
  orphanKeys: keep    # keep | delete
```

- **`keep`** (default) — orphan keys are preserved untouched, at their original position in the file. Nothing you add to a target file by hand is ever silently lost.
- **`delete`** — orphan keys are removed, so each target file mirrors the source exactly. Use this when the source is the single point of truth and target-only entries are considered leftovers.

Given this source and target:

```json
// en.json (source)          // it.json (target)
{                            {
  "one": "One",                "one": "Uno",
  "two": "Two"                 "only_it": "Solo italiano",
}                              "two": "Due"
                             }
```

`only_it` is an orphan. With `keep` it stays between `one` and `two`; with `delete` it is removed and the file ends up with just `one` and `two`.

### Important distinctions

- **Keys deleted from the source are always removed**, in both modes. Lara CLI tracks the source with a checksum file, so a key that *used to* exist and was then removed is recognised as deleted rather than as an orphan.
- **Non-translatable entries are never deleted**, even with `orphanKeys: delete`. These are not orphans — they are entries the parser deliberately skips:
  - Android XML resources marked `translatable="false"`
  - Xcode `.xcstrings` entries marked `shouldTranslate: false`
- **Gettext PO files** cannot always restore an orphan's original position; preserved orphan messages are appended at the end of the file.

### Overriding per run

The [`translate`](../commands/translate.md) command accepts `--orphan-keys <keep|delete>`, which overrides the config file for a single run — handy for a one-off cleanup without editing `lara.yaml`:

```bash
lara-cli translate --orphan-keys delete
```

## Related Topics

Each section of the configuration has its own detailed documentation:

- [Locales Configuration](./locales.md)
- [Files Configuration](./files.md)
- [Instructions Configuration](./instructions.md)
- [Translation Memories Configuration](./memories.md)
- [Glossaries Configuration](./glossaries.md)