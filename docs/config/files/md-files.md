# Markdown/MDX Files Configuration

This guide explains how to use Lara Dev with Markdown (`.md`) and MDX (`.mdx`) files for internationalization.

## Configuration

To configure Markdown/MDX files in your `lara.yaml`:

```yaml
files:
  md:
    include:
      - 'docs/[locale]/*.md'
      - 'content/blog/[locale]/*.mdx'
    exclude: []
    lockedKeys: []
    ignoredKeys: []
```

### File Path Patterns

Markdown files can be configured using glob patterns with the `[locale]` placeholder:

#### Locale-Based Pattern (Recommended)

Organize markdown files by locale:

```yaml
files:
  md:
    include:
      - 'docs/[locale]/*.md'
      - 'content/[locale]/**/*.mdx'
```

This pattern expects separate files per locale:

```text
docs/
  ├── en/
  │   ├── getting-started.md
  │   ├── api-reference.md
  │   └── guides/
  │       └── installation.md
  ├── es/
  │   ├── getting-started.md
  │   ├── api-reference.md
  │   └── guides/
  │       └── installation.md
  └── fr/
      ├── getting-started.md
      ├── api-reference.md
      └── guides/
          └── installation.md
```

#### Single Directory Pattern

If you use locale prefixes in filenames:

```yaml
files:
  md:
    include:
      - 'docs/[locale]-*.md'
```

This matches files like:

- `docs/en-getting-started.md`
- `docs/es-getting-started.md`
- `docs/fr-getting-started.md`

## Markdown File Structure

### Basic Structure

Lara Dev extracts text content from markdown files while preserving structure:

```markdown
# Welcome to Our Documentation

This is an introduction paragraph.

## Getting Started

Follow these steps:

1. Install the package
2. Configure settings
3. Run the application

> **Note:** Make sure you have Node.js installed.

For more information, visit [our website](https://example.com).
```

### Supported Markdown Elements

Lara Dev extracts text from:

- ✅ Headings (`#`, `##`, `###`, etc.)
- ✅ Paragraphs
- ✅ Lists (ordered and unordered)
- ✅ Blockquotes (`>`)
- ✅ Links (`[text](url)`)
- ✅ Bold (`**text**`)
- ✅ Italic (`*text*`)
- ✅ Strikethrough (`~~text~~`) - GFM
- ✅ Tables - GFM
- ✅ Task lists (`- [ ]` and `- [x]`) - GFM

### Excluded Elements

The following elements are **not** translated and preserved as-is:

- ❌ Code blocks (`code`)
- ❌ Inline code (`code`)
- ❌ HTML elements (`<div>`, `<span>`, etc.)
- ❌ YAML frontmatter
- ❌ URLs (in links and autolinks)
- ❌ Image alt text (stored as attributes, not extracted)

## How Lara Dev Handles Markdown Files

### Automatic Processing

Lara Dev automatically:

- ✅ Extracts text segments from markdown content
- ✅ Preserves markdown syntax and structure
- ✅ Maintains formatting (bold, italic, links, etc.)
- ✅ Keeps code blocks and inline code unchanged
- ✅ Preserves HTML elements
- ✅ Maintains table structure
- ✅ Preserves list formatting

### Text Segment Extraction

Lara Dev extracts text segments sequentially and assigns them keys:

- `segment_0` - First text segment
- `segment_1` - Second text segment
- `segment_2` - Third text segment
- etc.

**Example:**

```markdown
# Hello World

This is a paragraph with **bold** text.
```

Extracted segments:

- `segment_0`: "Hello World"
- `segment_1`: "This is a "
- `segment_2`: "bold"
- `segment_3`: " text."

### Key Path Format

When using `lockedKeys` or `ignoredKeys` with Markdown files, use segment-based keys:

```yaml
files:
  md:
    include:
      - 'docs/[locale]/*.md'
    lockedKeys:
      - 'segment_0' # First segment (e.g., title)
      - 'segment_5' # Specific segment
    ignoredKeys:
      - 'segment_10' # Ignore specific segment
```

**Note:** Segment indices are position-based and depend on the document structure. Use with caution as document changes may shift segment indices.

## Complete Example

Here's a complete configuration example for a documentation site:

```yaml
version: '1.0.0'

project:
  instruction: 'Technical documentation, clear and concise tone'

locales:
  source: en
  target:
    - es
    - fr
    - de
    - it

memories:
  - mem_abc123

glossaries:
  - gls_xyz789

files:
  md:
    include:
      - 'docs/[locale]/*.md'
      - 'docs/[locale]/guides/**/*.md'
    exclude:
      - 'docs/[locale]/draft-*.md'
      - 'docs/[locale]/**/changelog.md'
    fileInstructions:
      - path: 'docs/[locale]/getting-started.md'
        instruction: 'Beginner-friendly tutorial, use simple language'
      - path: 'docs/[locale]/api-reference.md'
        instruction: 'Technical API documentation, precise terminology'
```

## Working with Existing Markdown Files

If you already have markdown files organized by locale:

1. **Run `lara-dev init`** to create your configuration
2. **Ensure your file paths match the `include` patterns**
3. **Run `lara-dev translate`**
4. **Continue developing** - Lara Dev tracks changes via checksums and only translates what's new or modified

If your markdown files aren't organized by locale yet:

1. **Organize files** into locale-based directories or use locale prefixes
2. **Update your `lara.yaml`** to match your file structure
3. **Run `lara-dev translate`**

## Best Practices

### 1. Organize by Locale

Keep separate markdown files for each locale:

```text
docs/
  ├── en/
  │   └── guide.md
  ├── es/
  │   └── guide.md
  └── fr/
      └── guide.md
```

### 2. Preserve Code Examples

Code blocks are automatically preserved. Use them for:

- Code examples
- Configuration snippets
- Command-line instructions
- File paths

```markdown
To install the package, run:

\`\`\`bash
npm install my-package
\`\`\`

Then configure it in `config.js`.
```

### 3. Use Consistent Structure

Keep the same markdown structure across locales:

```markdown
# Title

Introduction paragraph.

## Section One

Content here.

## Section Two

More content.
```

### 4. Leverage Instructions

Use file-level instructions for better translation quality:

```yaml
files:
  md:
    include:
      - 'docs/[locale]/*.md'
    fileInstructions:
      - path: 'docs/[locale]/tutorial.md'
        instruction: 'Step-by-step tutorial, friendly and encouraging tone'
      - path: 'docs/[locale]/api.md'
        instruction: 'Technical reference, precise and formal'
```

### 5. Handle Code and Technical Terms

Code blocks and inline code are automatically excluded. For technical terms that shouldn't be translated:

- Use inline code: `` `API` `` or `` `npm` ``
- Use code blocks for longer examples
- Consider using `lockedKeys` for specific segments if needed

### 6. Preserve Links and URLs

Links are preserved automatically:

```markdown
Visit [our documentation](https://docs.example.com) for more info.
```

The link text is translated, but the URL remains unchanged.

### 7. Tables and Complex Structures

Tables are supported and cell content is extracted:

```markdown
| Feature | Description               |
| ------- | ------------------------- |
| Fast    | High performance          |
| Secure  | Enterprise-grade security |
```

Each cell's text content is extracted as a separate segment.

## Limitations

### File Format Requirements

- ✅ Standard markdown syntax
- ✅ GitHub Flavored Markdown (GFM) features
- ✅ MDX files (treated as markdown)
- ❌ YAML frontmatter is excluded (not translated)
- ❌ Image alt text is not extracted (stored as node attributes)

### Supported Patterns

- ✅ Locale-based directories: `docs/[locale]/*.md`
- ✅ Locale prefixes: `docs/[locale]-*.md`
- ✅ Recursive patterns: `docs/[locale]/**/*.mdx`
- ❌ Files without `[locale]` placeholder are not supported
- ❌ Single markdown files (must be organized by locale)

### Text Extraction Behavior

- Text segments are extracted sequentially based on document order
- Formatting markers (`**`, `*`, etc.) are preserved but text content is extracted
- Whitespace-only text nodes are ignored
- Empty paragraphs are skipped

### Segment Indexing

- Segment indices (`segment_0`, `segment_1`, etc.) are position-based
- Adding or removing content shifts segment indices
- Use `lockedKeys` and `ignoredKeys` carefully with segment indices
- Consider the document structure when using segment-based keys

## Related Documentation

- [Supported Formats](../formats.md) - Overview of all supported file formats
- [Files Configuration](../files.md) - General file configuration options
- [Instructions](../instructions.md) - How to use translation instructions
- [Locales](../locales.md) - Supported locale codes
