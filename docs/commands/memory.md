# Memory Command

The `memory` command lets you manage your Lara Translation Memories directly from the CLI. You can list, create, update, and delete Translation Memories, add and delete individual translation units, and bulk-import TMX files. Translation Memories enable Lara to adapt translations to your specific style and terminology.

## Usage

```bash
lara-cli memory [subcommand] [options]
```

Running `lara-cli memory` **without a subcommand** opens an interactive menu where you can choose any action: list, create, update, or delete a Translation Memory, add or delete a translation unit, or import a TMX file. When running in non-interactive mode (`-y`/`--non-interactive`), the bare command lists the available memories.

## Subcommands

| Subcommand | Description |
|------------|-------------|
| `list` | List all Translation Memories available in your Lara account |
| `create [name]` | Create a new Translation Memory |
| `update [id] [name]` | Update the name of an existing Translation Memory |
| `delete [id]` | Delete a Translation Memory (also removed from `lara.yaml`) |
| `add-translation [id] [source] [target] [sentence] [translation]` | Add a translation unit |
| `delete-translation [id] [source] [target] [sentence] [translation]` | Delete a translation unit |
| `import-tmx [id] [file]` | Import a TMX file into a Translation Memory |

### `list`

```bash
lara-cli memory list
```

Example output:

```bash
✔ Found 2 Translation Memories:

  ID: mem_abc123def456
  Name: Legal Terminology EN-ES

  ID: mem_xyz789uvw012
  Name: Marketing Brand Voice
```

### `create`

Create a new Translation Memory. If you omit the name in interactive mode, you will be prompted for it. After creation, you'll be asked whether to add the new memory id to your `lara.yaml` (so it's used automatically during translation).

```bash
# Interactive (prompts for the name and whether to add it to lara.yaml)
lara-cli memory create

# With a name
lara-cli memory create "Legal Terminology EN-ES"

# Non-interactive (name is required; the new id is added to lara.yaml automatically)
lara-cli memory create "Legal Terminology EN-ES" --non-interactive
```

### `update`

Update the name of an existing Translation Memory. In interactive mode, omitting the id lets you pick a memory from a searchable list, and omitting the name prompts for it.

```bash
# Interactive (select the memory and type the new name)
lara-cli memory update

# With id and new name
lara-cli memory update mem_abc123def456 "Legal Terminology (EU)"
```

### `delete`

Delete a Translation Memory. In interactive mode you pick it from a list and confirm; the id is also
removed from `lara.yaml` if present.

```bash
lara-cli memory delete                       # interactive: pick + confirm
lara-cli memory delete mem_abc123def456      # non-interactive
```

### `add-translation`

Add a single translation unit (a source/target text pair) to a memory. `source`/`target` are
language codes; `sentence` is the source text and `translation` is the translated text. Missing
values are prompted for in interactive mode.

```bash
lara-cli memory add-translation                                   # fully interactive
lara-cli memory add-translation mem_abc123def456 en it "Hello" "Ciao"
```

### `delete-translation`

Delete a translation unit. All of `id`, `source`, `target`, `sentence` (source text), and
`translation` (translated text) are required — the API matches the unit on the source/translation
pair.

```bash
lara-cli memory delete-translation mem_abc123def456 en it "Hello" "Ciao"
```

### `import-tmx`

Bulk-import translation units from a TMX file.

```bash
lara-cli memory import-tmx mem_abc123def456 ./translations.tmx
```

## Options

| Option | Description |
|--------|-------------|
| `-h, --help` | Display help information |
| `-y, --non-interactive` | Run without interactive prompts (global option) |

## Prerequisites

Before using the memory command, set up your Lara API credentials in a `.env` file:

```
LARA_ACCESS_KEY_ID=your_access_key_id
LARA_ACCESS_KEY_SECRET=your_access_key_secret
```

## Using Translation Memories

Once you have a memory id, you can use it for translations by:

1. **Creating via the CLI**: `lara-cli memory create "My Memory"` and accepting the prompt to add it to `lara.yaml`.

2. **During initialization**: Add memories when running `lara-cli init`.

   ```bash
   lara-cli init --translation-memories "mem_123abc, mem_456def" --non-interactive
   ```

3. **Manual configuration**: Add to your `lara.yaml` file.

   ```yaml
   memories:
     - mem_123abc
     - mem_456def
   ```

## Related

- [Translation Memories Configuration](../config/memories.md) - Detailed configuration options
