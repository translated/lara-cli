# Glossary Command

The `glossary` command allows you to list and view all Glossaries available in your Lara account. Glossaries give you full control over domain-specific terminology to ensure consistent and accurate translations across your content.

## Overview

Glossaries are structured terminology databases that help Lara maintain precise and consistent translations for domain-specific terms. By using Glossaries, you can:

- **Control terminology** with precision across all translations
- **Maintain consistency** for technical, legal, medical, or industry-specific terms
- **Preserve brand names** and product terminology exactly as specified
- **Define translations** for specific terms that should not be adapted
- **Support multiple languages** with unidirectional term mappings

Glossaries work by providing exact term-to-term translations that Lara uses during the translation process. Unlike Translation Memories (which use sentence-level examples), Glossaries focus on individual terms and phrases.

For more information about Glossaries, visit the [official documentation](https://developers.laratranslate.com/docs/manage-glossaries).

## Usage

### List Available Glossaries

```bash
lara-cli glossary
```

This command lists all Glossaries linked to your Lara account by ID and name.

**Example output:**
```bash
ℹ Found 3 Glossaries:

  ID: gls_abc123def456
  Name: Legal Terminology EN-ES

  ID: gls_xyz789uvw012
  Name: Medical Terms Database

  ID: gls_mno345pqr678
  Name: Product Names & Brands
```

## Prerequisites

Before using the glossary command, ensure you have:

1. **API Credentials**: Set up your Lara API credentials in a `.env` file:
   ```bash
   LARA_ACCESS_KEY_ID=your_access_key_id
   LARA_ACCESS_KEY_SECRET=your_access_key_secret
   ```

2. **Glossaries**: Create and populate Glossaries through the [Lara platform](https://laratranslate.com) or using the Lara SDK

## Using Glossaries with Lara CLI

Once you've identified your Glossaries using the `lara-cli glossary` command, you can configure your project to use them in two ways:

### 1. During Project Initialization

When running `lara-cli init`, you'll be prompted to select Glossaries:

```bash
lara-cli init

# You'll see prompts like:
? Do you want to use glossaries? Yes
? Select the glossaries Lara will use to personalize your translations
  ◉ Legal Terminology EN-ES
  ◯ Medical Terms Database
  ◉ Product Names & Brands
```

You can also specify Glossaries directly in non-interactive mode:

```bash
lara-cli init --source "en" --target "es, fr" \
  --glossaries "gls_abc123, gls_def456" \
  --non-interactive
```

### 2. Manual Configuration in lara.yaml

Edit your `lara.yaml` file directly to add or update Glossary IDs:

```yaml
version: "1.0.0"
locales:
  source: en
  target:
    - es
    - fr
glossaries:
  - gls_abc123
  - gls_def456
files:
  json:
    include:
      - "src/i18n/[locale].json"
```

The `glossaries` field accepts an array of Glossary IDs. You can find these IDs by:
- Using the `lara-cli glossary` command
- Checking the Lara platform dashboard
- Using the Lara SDK to programmatically retrieve them

### 3. Translation Behavior

When you run `lara-cli translate`, Lara will automatically use the configured Glossaries:

```bash
lara-cli translate
```

The translation engine will:
- Use your selected Glossaries to ensure precise terminology
- Apply exact term translations as defined in your Glossaries
- Maintain consistency for technical and domain-specific terms
- Override general translation rules with glossary-defined terms

## Glossary Management

While the CLI allows you to **list** and **use** Glossaries, full glossary management (creating, updating, importing terms, deleting) is available through:

1. **Lara Platform**: Web interface at [laratranslate.com](https://laratranslate.com)
2. **Lara SDK**: Programmatic access via the official SDKs (Python, Node.js, Java, PHP, Go, Kotlin, C#, Swift)

### Managing Glossary Content

Through the Lara Platform or SDK, you can:

- **Create** new glossaries for different domains
- **Import** terms via CSV files (bulk upload)
- **Update** glossary names and content
- **Export** glossaries for backup or migration
- **Delete** glossaries that are no longer needed
- **Check import status** for bulk uploads

### CSV Format for Glossary Import

Glossaries use a unidirectional format where terms work in one direction only (source → target):

```csv
en-US,es-ES,fr-FR
API,API,API
Database,Base de datos,Base de données
User Interface,Interfaz de usuario,Interface utilisateur
```

- **First column**: Source language terms
- **Other columns**: Target language translations
- **Headers**: Language codes (e.g., `en-US`, `es-ES`, `fr-FR`)

## Glossaries vs. Translation Memories

Understanding the difference helps you use both features effectively:

| Feature | Glossaries | Translation Memories |
|---------|-----------|---------------------|
| **Scope** | Individual terms/phrases | Full sentences and segments |
| **Use Case** | Precise terminology control | Style and context adaptation |
| **Format** | Term-to-term mapping | Sentence-to-sentence examples |
| **Best For** | Technical terms, brand names, domain-specific vocabulary | Tone, style, phrasing patterns |
| **Override** | Exact term replacement | Contextual adaptation |

**Recommendation**: Use **both together** for optimal results:
- **Glossaries**: Ensure critical terms are always translated correctly
- **Translation Memories**: Adapt overall style and phrasing to your brand voice
- **Instructions**: Guide tone, formality, and domain context

## Glossary Best Practices

### When to Use Glossaries

Glossaries are especially valuable for:

1. **Technical Documentation**
   - API names and technical terms
   - Product names and features
   - Industry-specific terminology

2. **Legal & Medical Content**
   - Standardized legal terms
   - Medical terminology and procedures
   - Regulatory and compliance language

3. **Brand & Marketing**
   - Company and product names
   - Brand-specific terminology
   - Trademarked terms and slogans

4. **Multi-Product Ecosystems**
   - Consistent feature names across products
   - Shared terminology standards
   - Cross-platform vocabulary

### Organizing Glossaries

Consider creating separate Glossaries for:

- **Domain-specific**: Legal, medical, technical, financial
- **Product-specific**: Different products or services
- **Language pairs**: Dedicated glossaries for specific source-target combinations
- **Client-specific**: Custom terminology for different clients

You can apply multiple Glossaries simultaneously—Lara will use terms from all selected glossaries.

### Populating Glossaries

Glossaries can be populated with:

- **Manual entry**: Add individual terms through the platform
- **CSV import**: Bulk upload via standardized CSV format
- **SDK integration**: Programmatic term addition via API

**Important**: Always use **complete language locale codes** (e.g., `en-US` instead of just `en`) when defining glossary terms to ensure proper regional variations.

## Important Notes

### Availability

Glossaries are available for **Pro and Team** subscriptions only. If you don't have access, contact the Lara team to upgrade your subscription.

### Glossary IDs

- Glossary IDs follow the format `gls_` followed by alphanumeric characters
- Each glossary has a unique ID that remains constant
- Use IDs (not names) in your `lara.yaml` configuration

### Empty Glossary List

If `lara-cli glossary` returns no Glossaries, it means:
- Your account doesn't have any Glossaries created yet
- Your subscription plan doesn't include Glossary access
- Your API credentials don't have permission to access Glossaries

Visit the [Lara platform](https://laratranslate.com) or contact support to create and configure Glossaries.

### Language Codes

When adding content to Glossaries, always use **complete language locale codes** (e.g., `pt-PT` instead of just `pt`). This ensures precise handling of regional variations (e.g., `pt-PT` vs. `pt-BR` for European vs. Brazilian Portuguese).

## Command Options

### `-h`, `--help`
- **Description**: Shows help information for the command

```bash
lara-cli glossary --help
```

## Examples

### List Available Glossaries

```bash
# View all Glossaries in your account
lara-cli glossary
```

### Use Glossaries in Project Setup

```bash
# Interactive mode with Glossary selection
lara-cli init

# Non-interactive mode with specific Glossaries
lara-cli init --source "en" --target "es, it" \
  --glossaries "gls_legal_123, gls_medical_456" \
  --non-interactive
```

### Update Glossaries in Existing Project

```bash
# Re-run init to update Glossary selection
lara-cli init --force
```

When prompted, you can update your Glossary selection. The `--force` flag allows you to overwrite your existing configuration.

### Combine Glossaries with Translation Memories

```bash
# Use both Glossaries and Translation Memories for optimal results
lara-cli init --source "en" --target "es, fr" \
  --glossaries "gls_abc123, gls_def456" \
  --translation-memories "mem_xyz789, mem_uvw012" \
  --instruction "Legal documentation, formal tone" \
  --non-interactive
```

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

### No Glossaries Available

If no glossaries are displayed, possible causes:
- Your subscription doesn't include Glossary access (requires Pro or Team)
- No Glossaries have been created for your account
- API credentials don't have proper permissions

**Solution**: Contact Lara support at support@translated.com to:
- Upgrade your subscription
- Create Glossaries
- Verify API credential permissions

### Glossary IDs Not Working

If you're manually adding glossary IDs to `lara.yaml` and they're not working:
- Verify the glossary ID format (should start with `gls_`)
- Ensure the glossaries belong to your account
- Check that your API credentials have access to those glossaries
- Run `lara-cli glossary` to confirm the glossaries exist

### Terms Not Being Applied

If glossary terms don't seem to be used in translations:
- Verify the glossary contains terms for your source-target language pair
- Check that the source language in your glossary matches your project's source locale
- Ensure the glossary IDs are correctly specified in `lara.yaml`
- Confirm your glossary is not empty (check via the Lara platform)

## Need More Help?

- [Init Command](init.md) - Configure Glossaries during initialization
- [Translate Command](translate.md) - Use Glossaries during translation
- [Configuration Reference](lara_yaml.md) - Manual Glossary configuration
- [Official Glossary Documentation](https://developers.laratranslate.com/docs/manage-glossaries) - Complete guide to Glossaries
- [Memory Command](memory.md) - Learn about Translation Memories

