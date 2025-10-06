# Memory Command

The `memory` command allows you to list and view all Translation Memories available in your Lara account. Translation Memories enable Lara to adapt translations to your specific style and terminology by learning from quality-vetted sentence translation examples.

## Overview

Translation Memories are repositories of past translation examples that help Lara adapt to your organization's style, terminology, and domain-specific language. By using Translation Memories, you can:

- **Maintain consistency** across all translations
- **Preserve brand voice** and terminology
- **Fix recurring translation errors** instantly
- **Adapt to domain-specific terminology** (legal, medical, technical, etc.)
- **Improve translation quality** continuously as new examples are added

Translation Memories work through **real-time adaptation** at inference time—no model training required. This means translation quality improves immediately as you add new examples.

For more information about Translation Memories, visit the [official documentation](https://developers.laratranslate.com/docs/adapt-to-translation-memories).

## Usage

### List Available Translation Memories

```bash
lara-cli memory
```

This command lists all Translation Memories linked to your Lara account by name.

**Example output:**
```bash
ℹ Legal Terminology - English to Spanish
ℹ Medical Terms Database
ℹ Marketing Brand Voice
```

## Prerequisites

Before using the memory command, ensure you have:

1. **API Credentials**: Set up your Lara API credentials in a `.env` file:
   ```bash
   LARA_ACCESS_KEY_ID=your_access_key_id
   LARA_ACCESS_KEY_SECRET=your_access_key_secret
   ```

2. **Translation Memories**: Create and populate Translation Memories through the [Lara platform](https://laratranslate.com) or by contacting the Lara team at support@translated.com

## Using Translation Memories with Lara CLI

Once you've identified your Translation Memories using the `lara-cli memory` command, you can configure your project to use them in two ways:

### 1. During Project Initialization

When running `lara-cli init`, you'll be prompted to select Translation Memories:

```bash
lara-cli init

# You'll see prompts like:
? Do you want to use translation memories? Yes
? Select the memories Lara will use to personalize your translations
  ◉ Legal Terminology - English to Spanish
  ◉ Medical Terms Database
  ◯ Marketing Brand Voice
```

You can also specify Translation Memories directly in non-interactive mode:

```bash
lara-cli init --source "en" --target "es, fr" \
  --translation-memories "mem_123abc, mem_456def" \
  --non-interactive
```

### 2. Manual Configuration in lara.yaml

Edit your `lara.yaml` file directly to add or update Translation Memory IDs:

```yaml
version: "1.0.0"
locales:
  source: en
  target:
    - es
    - fr
memories:
  - mem_123abc
  - mem_456def
files:
  json:
    include:
      - "src/i18n/[locale].json"
```

The `memories` field accepts an array of Translation Memory IDs. You can find these IDs by:
- Using the Lara platform dashboard
- Contacting Lara support
- Using the Lara SDK to programmatically retrieve them

### 3. Translation Behavior

When you run `lara-cli translate`, Lara will automatically adapt translations using the configured Translation Memories:

```bash
lara-cli translate
```

The translation engine will:
- Use your selected Translation Memories to personalize translations
- Match similar phrases and terminology from your memory examples
- Apply the style and tone consistent with your past translations
- Maintain domain-specific vocabulary

## Translation Memory Best Practices

### When to Use Translation Memories

Translation Memories are especially valuable for:

1. **Domain-Specific Projects**
   - Legal documents requiring precise terminology
   - Medical applications with standardized terms
   - Technical documentation with consistent vocabulary
   - Financial applications with regulated language

2. **Brand Consistency**
   - Marketing content with specific brand voice
   - Customer-facing applications requiring consistent tone
   - Multi-product suites needing unified terminology

3. **Continuous Improvement**
   - Projects with recurring translation errors
   - Applications requiring real-time quality fixes
   - Long-term projects with evolving terminology

### Organizing Translation Memories

Consider creating separate Translation Memories for:

- Different domains (legal, medical, technical)
- Different products or services
- Different brand voices (formal vs. casual)
- Different target audiences (B2B vs. B2C)

You can apply multiple Translation Memories simultaneously—Lara will intelligently combine examples from all selected memories.

### Populating Translation Memories

Translation Memories are populated with:

- **Sentence pairs**: Source and target translations
- **Quality-vetted examples**: Only include high-quality translations
- **TMX file imports**: Bulk import using standard TMX format

For help with creating and maintaining Translation Memories, Lara offers domain adaptation services for Team and Enterprise subscriptions. Contact support@translated.com for assistance.

## Important Notes

### Availability

Translation Memories (Domain Adaptation) are available for **Team** and **Enterprise** subscriptions only. If you don't have access, contact the Lara team to upgrade your subscription.

### Language Codes

When adding content to Translation Memories, always use **complete language locale codes** (e.g., `pt-PT` instead of just `pt`). This ensures precise regional adaptation as new language variants are released.

### Empty Memory List

If `lara-cli memory` returns no Translation Memories, it means:
- Your account doesn't have any Translation Memories created yet
- Your subscription plan doesn't include Translation Memory access
- Your API credentials don't have permission to access Translation Memories

Visit the [Lara platform](https://laratranslate.com) or contact support to create and configure Translation Memories.

## Command Options

### `-h`, `--help`
- **Description**: Shows help information for the command

```bash
lara-cli memory --help
```

## Examples

### List Available Memories

```bash
# View all Translation Memories in your account
lara-cli memory
```

### Use Memories in Project Setup

```bash
# Interactive mode with Translation Memory selection
lara-cli init

# Non-interactive mode with specific Translation Memories
lara-cli init --source "en" --target "es, it" \
  --translation-memories "mem_legal_123, mem_medical_456" \
  --non-interactive
```

### Update Memories in Existing Project

```bash
# Re-run init to update Translation Memory selection
lara-cli init --force
```

When prompted, you can update your Translation Memory selection. The `--force` flag allows you to overwrite your existing configuration.

## Troubleshooting

### No API Credentials Found

If you see this error:
```bash
✖ No API credentials found. Please run `lara-cli init` to set the API credentials.
```

**Solution**: Set up your API credentials by running:
```bash
lara-cli init --reset-credentials
```

### No Translation Memories Available

If no memories are displayed, possible causes:
- Your subscription doesn't include Translation Memory access
- No Translation Memories have been created for your account
- API credentials don't have proper permissions

**Solution**: Contact Lara support at support@translated.com to:
- Upgrade your subscription
- Create Translation Memories
- Verify API credential permissions

### Translation Memory IDs Not Working

If you're manually adding memory IDs to `lara.yaml` and they're not working:
- Verify the memory ID format (should start with `mem_`)
- Ensure the memories belong to your account
- Check that your API credentials have access to those memories
- Run `lara-cli memory` to confirm the memories exist

## Need More Help?

- [Init Command](init.md) - Configure Translation Memories during initialization
- [Translate Command](translate.md) - Use Translation Memories during translation
- [Configuration Reference](lara_yaml.md) - Manual Translation Memory configuration
- [Official Translation Memory Documentation](https://developers.laratranslate.com/docs/adapt-to-translation-memories) - Complete guide to Translation Memories

