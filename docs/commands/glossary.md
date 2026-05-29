# Glossary Command

The `glossary` command lets you manage your Lara Glossaries directly from the CLI. You can list, create, and update Glossaries. Glossaries ensure consistent and accurate translations for domain-specific terminology.

## Usage

```bash
lara-cli glossary [subcommand] [options]
```

Running `lara-cli glossary` **without a subcommand** opens an interactive menu where you can choose to list, create, or update a Glossary. When running in non-interactive mode (`-y`/`--non-interactive`), the bare command lists the available glossaries.

## Subcommands

| Subcommand | Description |
|------------|-------------|
| `list` | List all Glossaries available in your Lara account |
| `create [name]` | Create a new Glossary |
| `update [id] [name]` | Update the name of an existing Glossary |
| `delete [id]` | Delete a Glossary (also removed from `lara.yaml`) |
| `add-entry [id] [sourceLang] [sourceTerm] [targetLang] [targetTerm]` | Add a source→target entry |
| `delete-entry [id] [language] [value]` | Delete an entry by term |
| `import-csv [id] [file]` | Import a CSV file into a Glossary |

### `list`

```bash
lara-cli glossary list
```

Example output:

```bash
✔ Found 2 Glossaries:

  ID: gls_abc123def456
  Name: Legal Terminology EN-ES

  ID: gls_xyz789uvw012
  Name: Product Names & Brands
```

### `create`

Create a new Glossary. If you omit the name in interactive mode, you will be prompted for it. After creation, you'll be asked whether to add the new glossary id to your `lara.yaml` (so it's used automatically during translation).

```bash
# Interactive (prompts for the name and whether to add it to lara.yaml)
lara-cli glossary create

# With a name
lara-cli glossary create "Product Names & Brands"

# Non-interactive (name is required; the new id is added to lara.yaml automatically)
lara-cli glossary create "Product Names & Brands" --non-interactive
```

### `update`

Update the name of an existing Glossary. In interactive mode, omitting the id lets you pick a glossary from a searchable list, and omitting the name prompts for it.

```bash
# Interactive (select the glossary and type the new name)
lara-cli glossary update

# With id and new name
lara-cli glossary update gls_abc123def456 "Product Names (2024)"
```

### `delete`

Delete a Glossary. In interactive mode you pick it from a list and confirm; the id is also removed
from `lara.yaml` if present.

```bash
lara-cli glossary delete                      # interactive: pick + confirm
lara-cli glossary delete gls_abc123def456     # non-interactive
```

### `add-entry`

Add a single source→target entry. `sourceLang`/`targetLang` are language codes; `sourceTerm`/
`targetTerm` are the terms. Missing values are prompted for in interactive mode.

```bash
lara-cli glossary add-entry                                      # fully interactive
lara-cli glossary add-entry gls_abc123def456 en "cat" it "gatto"
```

### `delete-entry`

Delete an entry identified by a term (its language code + value).

```bash
lara-cli glossary delete-entry gls_abc123def456 en "cat"
```

### `import-csv`

Bulk-import entries from a CSV file (unidirectional `source,target,…` format — first column is the
source language).

```bash
lara-cli glossary import-csv gls_abc123def456 ./terms.csv
```

## Options

| Option | Description |
|--------|-------------|
| `-h, --help` | Display help information |
| `-y, --non-interactive` | Run without interactive prompts (global option) |

## Prerequisites

Before using the glossary command, set up your Lara API credentials in a `.env` file:

```
LARA_ACCESS_KEY_ID=your_access_key_id
LARA_ACCESS_KEY_SECRET=your_access_key_secret
```

## Using Glossaries

Once you have a glossary id, you can use it for translations by:

1. **Creating via the CLI**: `lara-cli glossary create "My Glossary"` and accepting the prompt to add it to `lara.yaml`.

2. **During initialization**: Add glossaries when running `lara-cli init`.

   ```bash
   lara-cli init --glossaries "gls_abc123, gls_def456" --non-interactive
   ```

3. **Manual configuration**: Add to your `lara.yaml` file.

   ```yaml
   glossaries:
     - gls_abc123
     - gls_def456
   ```

## Related

- [Glossaries Configuration](../config/glossaries.md) - Detailed configuration options
