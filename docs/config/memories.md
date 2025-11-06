---
title: Translation Memories
sidebar_position: 6
---

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

1. **Find available memories**: Run `lara-dev memory` to list available memories
2. **Add to configuration**: Add memory IDs to the `memories` section of `lara.yaml`
3. **Translate**: When you run `lara-dev translate`, these memories will be used automatically

## Best Practices

- Use separate memories for different domains (legal, medical, technical)
- Combine multiple memories for comprehensive terminology coverage
- Keep memories updated with quality-vetted translation examples
- Use with [instructions](./instructions.md) for best results

## Finding Memory IDs

- Run `lara-dev memory` to list available Translation Memories
- Check the Lara platform dashboard
- Contact Lara support for assistance
