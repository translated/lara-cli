# Translation Memories Configuration

Translation Memories allow Lara to adapt translations to your specific style and terminology using quality-vetted examples.

## Configuration

```yaml
memories:
  - mem_abc123
  - mem_def456
```

## Properties

- **Type**: Array of strings (Memory IDs)
- **Required**: No (defaults to empty array)
- **Format**: Memory IDs typically start with `mem_` (e.g., `mem_abc123`)

## Example Configurations

### No Translation Memories (Default)

```yaml
memories: []
```

### Single Translation Memory

```yaml
memories:
  - mem_legal_en_es_123
```

### Multiple Translation Memories

```yaml
memories:
  - mem_legal_terminology_456
  - mem_medical_terms_789
  - mem_brand_voice_abc
```

## Usage

To use Translation Memories:

1. **Find available memories**: Run `lara-cli memory list` to list available memories
2. **Create a memory**: Run `lara-cli memory create "<name>"` to create one (you can choose to add its id to `lara.yaml` automatically)
3. **Add to configuration**: Add memory IDs to the `memories` section of `lara.yaml`
4. **Translate**: When you run `lara-cli translate`, these memories will be used automatically

## Best Practices

- Use separate memories for different domains (legal, medical, technical)
- Combine multiple memories for comprehensive terminology coverage
- Keep memories updated with quality-vetted translation examples
- Use with [instructions](./instructions.md) for best results

## Managing Memories from the CLI

- Run `lara-cli memory list` to list available Translation Memories
- Run `lara-cli memory create "<name>"` to create a new Translation Memory
- Run `lara-cli memory update <id> "<name>"` to rename an existing Translation Memory
- Run `lara-cli memory delete <id>` to delete a Translation Memory
- Run `lara-cli memory add-translation <id> <source> <target> "<text>" "<translation>"` to add a translation unit
- Run `lara-cli memory delete-translation <id> <source> <target> "<text>" "<translation>"` to remove a translation unit
- Run `lara-cli memory import-tmx <id> <file>` to bulk-import a TMX file

See the [Memory Command](../commands/memory.md) documentation for details.

## Finding Memory IDs

- Run `lara-cli memory list` to list available Translation Memories
- Check the Lara platform dashboard
- Contact Lara support for assistance
