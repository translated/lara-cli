---
title: Glossaries
sidebar_position: 7
---

# Glossaries Configuration

Glossaries give you control over domain-specific terminology to ensure consistent and accurate translations across your content.

## Configuration

```yaml
glossaries:
  - gls_abc123
  - gls_def456
```

## Properties

- **Type**: Array of strings (Glossary IDs)
- **Required**: No (defaults to empty array)
- **Format**: Glossary IDs typically start with `gls_` (e.g., `gls_abc123`)
- **Availability**: Pro and Team subscriptions only

## Example Configurations

### No Glossaries (Default)

```yaml
glossaries: []
```

### Single Glossary

```yaml
glossaries:
  - gls_legal_en_es_123
```

### Multiple Glossaries

```yaml
glossaries:
  - gls_legal_terminology_456
  - gls_medical_terms_789
  - gls_product_names_abc
```

## Usage

To use Glossaries:

1. **Find available glossaries**: Run `lara-dev glossary` to list available glossaries
2. **Add to configuration**: Add glossary IDs to the `glossaries` section of `lara.yaml`
3. **Translate**: When you run `lara-dev translate`, these glossaries will be used automatically

## Best Practices

- Use separate glossaries for different domains (legal, medical, technical)
- Combine multiple glossaries for comprehensive terminology coverage
- Use glossaries for product names, brand terminology, and technical terms
- Use with [Translation Memories](./memories.md) and [instructions](./instructions.md) for best results

## Finding Glossary IDs

- Run `lara-dev glossary` to list available Glossaries
- Check the Lara platform dashboard
- Contact Lara support for assistance
