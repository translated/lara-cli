# Lara.yaml Configuration Reference

The `lara.yaml` configuration file defines how Lara CLI should handle your project's internationalization. This file is created by running `lara-cli init` (in either interactive or non-interactive mode) and is placed in your project's root directory.

## File Structure

A basic `lara.yaml` file has the following structure:

```yaml
version: "1.0.0"
locales:
  source: en
  target:
    - es
    - fr
memories: []
files:
  json:
    include:
      - "src/i18n/[locale].json"
    exclude: []
    fileInstructions: []
    keyInstructions: []
    lockedKeys: []
    ignoredKeys: []
```

## Core Configuration Sections

### Version

```yaml
version: "1.0.0"
```

The `version` field specifies the schema version of the configuration file. This helps with backward compatibility as the Lara CLI evolves.

### Locales

```yaml
locales:
  source: en
  target:
    - es
    - fr
```

The `locales` section defines the source and target languages for translation:

- **source**: The source locale code from which content will be translated
- **target**: An array of target locale codes to which content will be translated

For a full list of supported locales, see the [Supported Locales](../README.md#supported-locales) section in the main README.

### Translation Memories

```yaml
memories:
  - mem_abc123
  - mem_def456
```

The `memories` section is an optional array of Translation Memory IDs that Lara will use to adapt translations to your specific style and terminology.

**What are Translation Memories?**

Translation Memories are repositories of quality-vetted sentence translation examples that help Lara adapt in real-time to your organization's style, terminology, and domain-specific language. They enable:

- **Domain adaptation** using past translation examples
- **Consistent terminology** across all translations
- **Brand voice preservation** in all locales
- **Instant error correction** by adding new examples
- **Continuous quality improvement** without model retraining

**Configuration:**

- **Type**: Array of strings (Translation Memory IDs)
- **Default**: `[]` (empty array, no Translation Memories used)
- **Format**: Memory IDs typically start with `mem_` (e.g., `mem_abc123`)
- **Behavior**: When empty or not specified, no Translation Memories are used

**How to find Translation Memory IDs:**

1. Run `lara-cli memory` to list all available Translation Memories
2. Check the Lara platform dashboard
3. Contact Lara support for assistance

**Example configurations:**

```yaml
# No Translation Memories (default)
memories: []

# Single Translation Memory
memories:
  - mem_legal_en_es_123

# Multiple Translation Memories for comprehensive coverage
memories:
  - mem_legal_terminology_456
  - mem_medical_terms_789
  - mem_brand_voice_abc
```

**Best practices:**

- Use separate memories for different domains (legal, medical, technical, marketing)
- Combine multiple memories for comprehensive terminology coverage
- Keep memories updated with quality-vetted translation examples
- Use complete locale codes (e.g., `pt-PT` not `pt`) when populating memories

**Requirements:**

- Available for **Team and Enterprise subscriptions only**
- Memory IDs must belong to your Lara account
- Memories must be created and populated through the Lara platform or SDK

**Related documentation:**

- [Memory Command](memory.md) - List and manage Translation Memories
- [Init Command](init.md#using-translation-memories) - Configure memories during initialization
- [Official Translation Memory Documentation](https://developers.laratranslate.com/docs/adapt-to-translation-memories)

**Translation Memories vs. Instructions:**

Translation Memories and Instructions work together but serve different purposes:

- **Translation Memories**: Provide concrete past translation examples (sentence pairs) for adaptation
- **Instructions**: Provide natural language directives about tone, style, and requirements
- **Best approach**: Use both together for optimal translation quality
  - Instructions define the general style and domain context
  - Translation Memories provide specific terminology and phrasing examples

### Files

The `files` section contains configuration for different file types. Currently, Lara CLI supports JSON files for internationalization:

```yaml
files:
  json:
    include:
      - "src/i18n/[locale].json"
      - "public/locales/[locale]/translations.json"
    exclude:
      - "**/metadata/**"
    fileInstructions:
      - path: "src/i18n/[locale].json"
        instruction: "User interface translations"
        keyInstructions:
          - path: "product/title"
            instruction: "Keep concise, maximum 60 characters"
      - path: "public/locales/[locale]/translations.json"
        instruction: "Marketing content"
        keyInstructions:
          - path: "campaign/**"
            instruction: "Promotional messaging, enthusiastic tone"
    keyInstructions:
      - path: "checkout/**"
        instruction: "Payment process, use formal tone"
    lockedKeys:
      - "**/id"
      - "config/*/url"
    ignoredKeys:
      - "internal/**"
```

Each file type has the following properties:

#### Include and Exclude Patterns

##### Include Paths

```yaml
include:
  - "src/i18n/[locale].json"
```

An array of file paths to monitor for translation. These paths:

- Must include the `[locale]` placeholder
- Must be relative paths
- Must have a supported file extension (currently `.json`)
- Can use glob patterns for matching multiple files

##### Exclude Paths

```yaml
exclude:
  - "**/metadata/**"
```

An array of file paths to exclude from translation. These follow the same pattern rules as include paths.

##### How Include and Exclude Work Together

The include and exclude patterns work together in the following way:

1. First, Lara CLI processes your `include` patterns to generate a list of files to translate
2. Then, for each file matched by the include patterns, it checks if the file also matches any exclude pattern
3. If a file matches an exclude pattern, it is skipped; otherwise, it is processed

Exclude patterns are most useful when you're using wildcard patterns in your include paths. Here are practical examples:

```yaml
# Example 1: Using exclude with wildcards
include:
  - "src/i18n/[locale]/*.json"  # All JSON files in this directory
exclude:
  - "src/i18n/[locale]/draft-*.json"  # Except draft files

# Example 2: Excluding specific files from a group
include:
  - "src/locales/[locale]/**/*.json"  # All JSON files in all subdirectories
exclude:
  - "src/locales/[locale]/internal/admin.json"  # Except this specific file

# Example 3: Real-world scenario
include:
  - "src/i18n/[locale]/pages/**/*.json"  # All page translations
  - "src/i18n/[locale]/components/**/*.json"  # All component translations
exclude:
  - "src/i18n/[locale]/pages/dev/**/*.json"  # Skip development pages
```

**Note:** Exclude patterns have little effect when your include patterns specify exact file paths without wildcards, as there's no potential for overlap.

#### File Instructions

```yaml
fileInstructions:
  - path: "src/i18n/[locale].json"
    instruction: "User interface translations"
    keyInstructions:
      - path: "product/title"
        instruction: "Keep concise, maximum 60 characters"
      - path: "product/description/*"
        instruction: "Detailed product information"
  - path: "public/locales/[locale]/translations.json"
    instruction: "Marketing content"
    keyInstructions:
      - path: "campaign/**"
        instruction: "Promotional messaging"
```

An array of file-specific instructions. Each entry defines instructions for an individual file and optionally its keys:

- **path**: The exact file path (must match an entry in `include`)
- **instruction** (optional): Instruction that applies to all translations in this specific file
- **keyInstructions** (optional): Array of key-specific instructions for this file only

File instructions allow you to:
- Provide different instructions for each translation file
- Define file-specific key instructions
- Handle files with different purposes or audiences differently

#### Global Key Instructions

```yaml
keyInstructions:
  - path: "checkout/**"
    instruction: "Payment process, use formal tone"
  - path: "**/cta"
    instruction: "Call-to-action buttons"
  - path: "error/**"
    instruction: "Error messages, be clear and helpful"
```

An array of global key-specific instructions that apply to **all files**. Each entry has:

- **path**: A key pattern using the same glob syntax as `lockedKeys` and `ignoredKeys`
- **instruction**: Instruction information specific to keys matching this pattern

Global key instructions are useful for:
- Consistent handling of common key patterns across all files
- Shared components or sections (checkout, errors, navigation)
- Common UI elements (buttons, labels, tooltips)

**Priority:** File-specific `keyInstructions` take precedence over global `keyInstructions` when both match the same key.

#### Locked Keys

```yaml
lockedKeys:
  - "**/id"
  - "api/**"
```

An array of keys that should not be translated. When a key matches one of these patterns:

- The source value will be copied directly to the target file
- No translation will be performed

This is useful for:
- IDs
- URLs
- Technical values
- Code snippets

#### Ignored Keys

```yaml
ignoredKeys:
  - "internal/**"
  - "**/debug"
```

An array of keys to ignore during translation. When a key matches one of these patterns:

- The key will be completely excluded from target files
- The key won't appear at all in translated files

This is useful for:
- Metadata
- Debug information
- Internal configuration
- Values that should be omitted in translations

### Translation Instructions

Lara CLI supports translation instructions to adjust translation tone, style, and behavior. Adding contextual information helps clarify potential ambiguities in the source text and achieve even better translations.

#### What Are Instructions?

Instructions are directives written in natural language that guide Lara's translation process. They can specify formality, tone, domain-specific terminology, or any other translation requirement. Only **one instruction** is applied per translation, following a priority hierarchy.

For detailed information about instructions, see the [Lara Translation Instructions documentation](https://developers.laratranslate.com/docs/adapt-to-instructions).

#### Project Instruction

```yaml
project:
  instruction: "E-commerce platform for fashion retail"
```

The broadest level of instruction that applies to **all translations** in your project. Use this to describe:
- Overall project domain (e-commerce, healthcare, education, etc.)
- General brand voice and tone
- Target audience characteristics
- Industry-specific terminology requirements

#### File-Specific Instruction

```yaml
files:
  json:
    fileInstructions:
      - path: "src/i18n/[locale].json"
        instruction: "Product catalog and shopping interface"
      - path: "src/admin/[locale].json"
        instruction: "Admin panel for internal users"
```

Instruction for **individual files**. Each file can have its own instruction to describe:
- The specific purpose of this file
- Target audience for this file (end users, admins, etc.)
- Tone or style specific to this file
- Technical constraints for this file

#### Key Instructions

There are two types of key instructions:

**File-Specific Key Instructions:**
```yaml
files:
  json:
    fileInstructions:
      - path: "src/i18n/[locale].json"
        instruction: "Product catalog"
        keyInstructions:
          - path: "product/title"
            instruction: "Keep concise, maximum 60 characters"
          - path: "product/price"
            instruction: "Include currency symbol"
```

Applies only to keys within a specific file. Use this for:
- File-specific length or formatting constraints
- Special terminology for fields in this file
- Requirements unique to this file's content

**Global Key Instructions:**
```yaml
files:
  json:
    keyInstructions:
      - path: "checkout/**"
        instruction: "Payment process, use formal tone"
      - path: "**/cta"
        instruction: "Call-to-action buttons, use action verbs"
      - path: "error/**"
        instruction: "Error messages, be clear and helpful"
```

Applies to matching keys in **all files**. Use this for:
- Consistent handling of common patterns across all files
- Shared components (checkout, navigation, errors)
- Universal UI elements that appear everywhere

#### Instruction Priority (Override Strategy)

Lara CLI uses an **override strategy** where only **one instruction** is applied per translation. The most specific instruction wins:

**Priority (highest to lowest):**
1. **File-specific key instruction** (highest priority)
2. **Global key instruction**
3. **File instruction**
4. **Project instruction** (lowest priority)

**Example:**

```yaml
project:
  instruction: "E-commerce platform for fashion retail"
files:
  json:
    fileInstructions:
      - path: "src/i18n/[locale].json"
        instruction: "Product catalog and shopping interface"
        keyInstructions:
          - path: "product/title"
            instruction: "Keep concise, maximum 60 characters"
    keyInstructions:
      - path: "checkout/**"
        instruction: "Payment and shipping process, use formal tone"
```

**Translation examples:**

When translating `product/title` in `src/i18n/[locale].json`:
- **Instruction used:** "Keep concise, maximum 60 characters"
- **Reason:** File-specific key instruction (highest priority)

When translating `checkout/button/pay` in `src/i18n/[locale].json`:
- **Instruction used:** "Payment and shipping process, use formal tone"
- **Reason:** Global key instruction (no file-specific key instruction matches)

When translating `product/description` in `src/i18n/[locale].json`:
- **Instruction used:** "Product catalog and shopping interface"
- **Reason:** File instruction (no key instruction matches)

When translating any key in `src/admin/[locale].json` (no specific instructions):
- **Instruction used:** "E-commerce platform for fashion retail"
- **Reason:** Project instruction (fallback when nothing more specific matches)

**Best Practices:**
- Use project instruction for domain and brand voice
- Use file instruction when files serve different purposes
- Use global key instructions for patterns that appear across multiple files
- Use file-specific key instructions for unique requirements
- Be specific and concise—instructions are directives, not translation content
- Avoid contradictory instructions at different levels

## Path Patterns

All path specifications in `lara.yaml` use the `[locale]` placeholder to identify where the locale code should be inserted.

### Directory-based Patterns

```
src/i18n/[locale]/common.json
locales/[locale]/app.json
translations/[locale]/messages.json
```

### Filename-based Patterns

```
src/i18n/[locale].json
locales/app.[locale].json
i18n/messages.[locale].json
```

### Mixed Patterns

```
src/i18n/[locale]/[locale].json
```

## Pattern Matching

The configuration file supports glob patterns for flexible file and key matching:

- `*`: Matches any characters except path separators
- `**`: Matches any characters including path separators (recursive)
- `?`: Matches any single character
- `[abc]`: Matches any character in the specified set
- `{a,b}`: Matches any of the listed alternatives

### Key Pattern Examples

```yaml
# File-specific instructions with keys
fileInstructions:
  - path: "src/i18n/[locale].json"
    instruction: "Main UI"
    keyInstructions:
      - path: "product/title"        # Specific key
        instruction: "Keep concise, max 60 chars"
      - path: "product/description/*" # One level deep
        instruction: "Detailed product info"
  - path: "src/admin/[locale].json"
    instruction: "Admin panel"
    keyInstructions:
      - path: "dashboard/**"         # All nested keys
        instruction: "Technical terminology"

# Global key instructions (apply to all files)
keyInstructions:
  - path: "checkout/**"          # All nested keys
    instruction: "Formal tone for payment"
  - path: "**/cta"               # Any key ending with "cta"
    instruction: "Call-to-action buttons"
  - path: "error/**"             # Error messages
    instruction: "Clear and helpful"

# Locked keys examples
lockedKeys:
  - "**/id"           # Any key ending with "id"
  - "api/**"          # Any key starting with "api/"
  - "config/*/url"    # URLs in config sections
  - "metadata/**"     # Entire metadata sections

# Ignored keys examples
ignoredKeys:
  - "internal/**"     # Internal configuration
  - "**/debug"        # Debug information
  - "temp/**"         # Temporary data
```

## Complete Configuration Examples

### Basic Configuration

```yaml
version: "1.0.0"
locales:
  source: en
  target:
    - es
    - fr
memories: []
files:
  json:
    include:
      - "src/i18n/[locale].json"
    exclude: []
    fileInstructions: []
    keyInstructions: []
    lockedKeys: []
    ignoredKeys: []
```

### Advanced Configuration

```yaml
version: "1.0.0"
project:
  instruction: "E-commerce platform for fashion retail"
locales:
  source: en
  target:
    - es
    - fr
    - de
    - it
memories:
  - mem_abcr13s
  - mem_vex24fv
files:
  json:
    include:
      - "src/i18n/[locale].json"
      - "src/admin/[locale].json"
      - "public/marketing/[locale].json"
    exclude:
      - "**/metadata/**"    # Exclude files contained in any metadata folder
      - "**/config/**"      # Exclude files contained in any config folder
    fileInstructions:
      - path: "src/i18n/[locale].json"
        instruction: "Product catalog and shopping interface for customers"
        keyInstructions:
          - path: "product/title"
            instruction: "Keep concise, maximum 60 characters"
          - path: "product/description/*"
            instruction: "Detailed product information, can be longer"
          - path: "product/specifications/**"
            instruction: "Technical details, use precise terminology"
      - path: "src/admin/[locale].json"
        instruction: "Admin panel for internal users and store managers"
        keyInstructions:
          - path: "dashboard/**"
            instruction: "Analytics and reporting, technical terminology"
          - path: "settings/**"
            instruction: "Configuration options, be precise and technical"
      - path: "public/marketing/[locale].json"
        instruction: "Marketing and promotional content"
        keyInstructions:
          - path: "campaign/**"
            instruction: "Promotional messaging, enthusiastic and engaging"
    keyInstructions:
      - path: "checkout/**"
        instruction: "Payment and shipping process, use formal and reassuring tone"
      - path: "**/cta"
        instruction: "Call-to-action buttons, use action verbs"
      - path: "error/**"
        instruction: "Error messages, be clear and helpful"
    lockedKeys:
      - "**/id"
      - "**/path"
      - "**/url"
      - "api/**"
    ignoredKeys:
      - "metadata/**"
      - "internal/**"
```

## JSON Structure in Translation Files

Lara CLI processes JSON files with nested structures. For example, a source file might look like:

```json
{
  "dashboard": {
    "title": "Dashboard",
    "buttons": {
      "save": "Save",
      "cancel": "Cancel"
    }
  }
}
```

When processed internally, Lara flattens this structure using path notation:

```json
{
  "dashboard/title": "Dashboard",
  "dashboard/buttons/save": "Save",
  "dashboard/buttons/cancel": "Cancel"
}
```

This flattened structure is what the key patterns in `lockedKeys` and `ignoredKeys` match against.
