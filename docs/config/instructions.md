---
title: Translation Instructions
sidebar_position: 5
---

# Translation Instructions

Translation instructions help adjust the tone, style, and behavior of translations. They provide context that helps clarify ambiguities in the source text.

## Instruction Levels

Lara supports instructions at multiple levels, from project-wide to key-specific.

### Project Instruction

```yaml
project:
  instruction: "E-commerce platform for fashion retail. Use friendly, conversational tone."
```

- **Scope**: Applies to all translations in the project
- **Use for**: Overall project domain, general brand voice, target audience

### File-Specific Instructions

```yaml
files:
  json:
    fileInstructions:
      - path: "src/i18n/[locale].json"
        instruction: "Product catalog and shopping interface"
      - path: "src/admin/[locale].json"
        instruction: "Admin panel for internal users"
```

- **Scope**: Applies to specific files
- **Use for**: File-specific purpose, audience, or context

### Key Instructions

#### File-Specific Key Instructions

```yaml
files:
  json:
    fileInstructions:
      - path: "src/i18n/[locale].json"
        instruction: "Product catalog"
        keyInstructions:
          - path: "product/title"
            instruction: "Keep concise, maximum 60 characters"
          - path: "product/description/*"
            instruction: "Detailed product information"
```

- **Scope**: Keys within specific files
- **Use for**: Special requirements for fields in a specific file

#### Global Key Instructions

```yaml
files:
  json:
    keyInstructions:
      - path: "checkout/**"
        instruction: "Payment process, use formal tone"
      - path: "**/cta"
        instruction: "Call-to-action buttons, use action verbs"
```

- **Scope**: Keys across all files matching the pattern
- **Use for**: Consistent handling of common patterns across all files

## Instruction Priority

Only one instruction is applied per translation. When multiple instructions apply, the most specific wins:

1. **File-specific key instruction** (highest priority)
2. **Global key instruction**
3. **File instruction**
4. **Project instruction** (lowest priority)

## Best Practices

- **Be specific**: "Use formal language for a medical audience" is better than "Be formal"
- **Include domain context**: "Legal documentation for contracts" provides important context
- **Specify tone**: "Use friendly, conversational tone" or "Use technical, precise language"
- **Mention constraints**: "Keep under 30 characters" or "Preserve HTML tags"
- **Keep concise**: 1-2 sentences is usually sufficient
