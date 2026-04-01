# Plain Text Files Configuration

This guide explains how to use Lara CLI with plain text (`.txt`) files for internationalization.

## Configuration

To configure plain text files in your `lara.yaml`:

```yaml
files:
  txt:
    include:
      - 'texts/[locale]/*.txt'
    exclude: []
    lockedKeys: []
    ignoredKeys: []
```

### File Path Patterns

Plain text files can be configured using glob patterns with the `[locale]` placeholder:

#### Locale-Based Directory Pattern (Recommended)

Organize text files by locale in separate directories:

```yaml
files:
  txt:
    include:
      - 'texts/[locale]/*.txt'
      - 'content/[locale]/**/*.txt'
```

This pattern expects separate files per locale:

```text
texts/
  ├── en/
  │   ├── messages.txt
  │   ├── notifications.txt
  │   └── emails/
  │       └── welcome.txt
  ├── es/
  │   ├── messages.txt
  │   ├── notifications.txt
  │   └── emails/
  │       └── welcome.txt
  └── fr/
      ├── messages.txt
      ├── notifications.txt
      └── emails/
          └── welcome.txt
```

#### Locale in Filename Pattern

If you use locale codes in filenames:

```yaml
files:
  txt:
    include:
      - 'texts/[locale].txt'
```

This matches files like:

- `texts/en.txt`
- `texts/es.txt`
- `texts/fr.txt`

## Plain Text File Structure

### Basic Structure

Lara CLI extracts text content from plain text files on a line-by-line basis:

```text
Welcome to our application
Please sign in to continue
Thank you for your purchase
```

Each non-empty line becomes an independent translatable segment. Empty lines are preserved structurally but not translated.

### How Lines Are Extracted

Lara CLI extracts non-empty lines sequentially and assigns them keys:

- `line_0` - First non-empty line
- `line_1` - Second non-empty line
- `line_2` - Third non-empty line
- etc.

**Example:**

```text
Hello World

Welcome to our application.

Thank you for using our product.
```

Extracted segments:

- `line_0`: "Hello World"
- `line_1`: "Welcome to our application."
- `line_2`: "Thank you for using our product."

Empty lines between content are preserved in the translated output but are not assigned keys.

### What Is Translated

- Each non-empty line (lines containing at least one non-whitespace character)

### What Is Preserved (Not Translated)

- Empty lines (used as structural separators)
- Whitespace-only lines
- Leading and trailing whitespace within content lines
- Trailing newlines at end of file

## Key Path Format

When using `lockedKeys` or `ignoredKeys` with plain text files, use line-based keys:

```yaml
files:
  txt:
    include:
      - 'texts/[locale]/*.txt'
    lockedKeys:
      - 'line_0'  # First line (e.g., title)
      - 'line_5'  # Specific line
    ignoredKeys:
      - 'line_10' # Ignore specific line
```

**Note:** Line indices are position-based (counting only non-empty lines) and depend on the document structure. Use with caution as document changes may shift line indices.

## Complete Example

Here's a complete configuration example:

```yaml
version: '1.0.0'

project:
  instruction: 'Simple, clear language for UI text'

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
  txt:
    include:
      - 'texts/[locale]/messages.txt'
      - 'texts/[locale]/notifications.txt'
    exclude:
      - 'texts/[locale]/draft-*.txt'
    fileInstructions:
      - path: 'texts/[locale]/notifications.txt'
        instruction: 'Short notification messages, concise and clear'
```

## Working with Existing Text Files

If you already have text files organized by locale:

1. **Run `lara-cli init`** to create your configuration
2. **Ensure your file paths match the `include` patterns**
3. **Run `lara-cli translate`**
4. **Continue developing** - Lara CLI tracks changes via checksums and only translates what's new or modified

If your text files aren't organized by locale yet:

1. **Organize files** into locale-based directories or use locale prefixes in filenames
2. **Update your `lara.yaml`** to match your file structure
3. **Run `lara-cli translate`**

## Best Practices

### 1. Organize by Locale

Keep separate text files for each locale:

```text
texts/
  ├── en/
  │   └── messages.txt
  ├── es/
  │   └── messages.txt
  └── fr/
      └── messages.txt
```

### 2. One Translatable Unit Per Line

Each line should contain one independent piece of text:

```text
Welcome to our app
Sign in to continue
Forgot your password?
```

Avoid splitting a single sentence across multiple lines, as each line is translated independently.

### 3. Use Empty Lines as Separators

Group related content with empty lines for readability:

```text
Welcome to our app

Sign in to continue
Create a new account

Need help?
Contact support
```

### 4. Use Consistent Structure

Keep the same line structure across all locale files to ensure translations align correctly.

### 5. Leverage Instructions

Use file-level instructions for better translation quality:

```yaml
files:
  txt:
    include:
      - 'texts/[locale]/*.txt'
    fileInstructions:
      - path: 'texts/[locale]/ui-messages.txt'
        instruction: 'Short UI labels and button text, keep concise'
      - path: 'texts/[locale]/emails.txt'
        instruction: 'Email content, professional and friendly tone'
```

## Limitations

### File Format

- Each non-empty line is treated as an independent translatable unit
- No support for multi-line paragraphs (each line is a separate segment)
- No support for key-value pairs (use JSON or PO for structured translations)
- No support for comments or metadata within the file

### Supported Patterns

- Locale-based directories: `texts/[locale]/*.txt`
- Locale in filenames: `texts/[locale].txt`
- Recursive patterns: `texts/[locale]/**/*.txt`
- Files without `[locale]` placeholder are not supported

### Line Indexing

- Line indices (`line_0`, `line_1`, etc.) count only non-empty lines
- Adding or removing lines shifts line indices
- Use `lockedKeys` and `ignoredKeys` carefully with line indices
- Consider the document structure when using line-based keys

## Related Documentation

- [Supported Formats](../formats.md) - Overview of all supported file formats
- [Files Configuration](../files.md) - General file configuration options
- [Instructions](../instructions.md) - How to use translation instructions
- [Locales](../locales.md) - Supported locale codes
