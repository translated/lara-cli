# TS Files Configuration

This guide explains how to use Lara Dev with TypeScript (`.ts`) files, commonly used in Vue.js, React, and other TypeScript/JavaScript applications for internationalization.

## What are TS Files?

TypeScript files are used to store translation messages in JavaScript/TypeScript applications, particularly in frameworks like:

- Vue.js (with vue-i18n)
- React (with react-i18next)
- Angular (with ngx-translate)
- Next.js applications
- Any TypeScript/JavaScript project

Lara Dev supports TypeScript files that follow the standard pattern where translations are stored in a `const messages = {...}` object structure.

## Configuration

To configure TS files in your `lara.yaml`:

```yaml
files:
  ts:
    include:
      - "src/i18n.ts"
    exclude: []
    lockedKeys: []
    ignoredKeys: []
```

### File Path Patterns

TS files can be configured in two ways:

#### Single File Pattern (Recommended)

Use a single TypeScript file that contains all locales:

```yaml
files:
  ts:
    include:
      - "src/i18n.ts"
```

This pattern works with files named `i18n.ts` that contain all locales in a single file:

```typescript
const messages = {
  "en": {
    "nav": {
      "home": "Home",
      "about": "About us"
    }
  },
  "it": {
    "nav": {
      "home": "Home",
      "about": "Chi siamo"
    }
  }
}

export default messages;
```

#### Locale-Based Pattern

You can also use the `[locale]` placeholder pattern:

```yaml
files:
  ts:
    include:
      - "src/i18n/[locale].ts"
```

This pattern expects separate files per locale:

```text
src/i18n/
  ├── en.ts
  ├── es.ts
  └── fr.ts
```

## TS File Structure

### Required Format

Lara Dev expects TypeScript files to follow this structure:

```typescript
const messages = {
  // Your translation object here
}

export default messages;
```

The parser looks for the `const messages =` pattern and extracts the object that follows it.

### Single File with Multiple Locales

The most common pattern is a single file containing all locales:

```typescript
import { createI18n } from 'vue-i18n'

const messages = {
  "en": {
    "nav": {
      "home": "Home",
      "about": "About us",
      "services": "Services",
      "contacts": "Contact"
    },
    "home": {
      "title": "Welcome to our multilingual website",
      "description": "This is a demo site created with Vue.js and vue-i18n."
    }
  },
  "it": {
    "nav": {
      "home": "Home",
      "about": "Chi siamo",
      "services": "Servizi",
      "contacts": "Contatti"
    },
    "home": {
      "title": "Ti diamo il benvenuto nel nostro sito multilingue",
      "description": "Questo è un sito demo creato con Vue.js e vue-i18n."
    }
  }
}

const i18n = createI18n({
  legacy: false,
  locale: 'it',
  fallbackLocale: 'en',
  messages,
})

export default i18n
```

### Nested Structure

Lara Dev supports deeply nested translation structures:

```typescript
const messages = {
  "en": {
    "common": {
      "buttons": {
        "submit": "Submit",
        "cancel": "Cancel"
      }
    },
    "dashboard": {
      "title": "Dashboard",
      "welcome": "Welcome back",
      "stats": {
        "users": "Users",
        "revenue": "Revenue"
      }
    }
  }
}
```

## How Lara Dev Handles TS Files

### Automatic Processing

Lara Dev automatically:

- ✅ Extracts the `messages` object from your TypeScript file
- ✅ Preserves the original file structure and formatting
- ✅ Handles locale-prefixed keys (e.g., `en/nav/home`, `it/nav/home`)
- ✅ Maintains nested object structures
- ✅ Preserves all other code in the file (imports, exports, etc.)

### Key Path Format

When using `lockedKeys` or `ignoredKeys` with TS files, use the flattened key path format:

```yaml
files:
  ts:
    include:
      - "src/i18n.ts"
    lockedKeys:
      - "en/nav/home"        # Specific locale key
      - "*/common/buttons/*" # Wildcard pattern
    ignoredKeys:
      - "*/debug/*"          # Ignore all debug keys
```

The delimiter `/` is used to separate nested keys, and locale prefixes are included when specifying keys.

## Complete Example

Here's a complete configuration example for a Vue.js project:

```yaml
version: "1.0.0"

project:
  instruction: "E-commerce application, use formal tone"

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
  ts:
    include:
      - "src/i18n.ts"
    exclude: []
    lockedKeys:
      - "**/common/brand_name"
      - "**/common/version"
    ignoredKeys:
      - "**/debug/**"
      - "**/test/**"
    fileInstructions:
      - path: "src/i18n.ts"
        instruction: "User-facing messages, friendly and professional tone"
        keyInstructions:
          - path: "**/errors/**"
            instruction: "Error messages should be clear and helpful"
```

## Working with Existing TS Files

If you already have TypeScript files with translations:

1. **Run `lara-dev init`** to create your configuration
2. **Ensure your file follows the `const messages = {...}` pattern**
3. **Run `lara-dev translate`**
4. **Continue developing** - Lara Dev tracks changes via checksums and only translates what's new or modified

## Best Practices

### 1. Use Consistent Structure

Keep the same key structure across all locales in your `messages` object:

```typescript
const messages = {
  "en": {
    "nav": { "home": "Home" },
    "home": { "title": "Welcome" }
  },
  "it": {
    "nav": { "home": "Home" },      // ✅ Same structure
    "home": { "title": "Benvenuto" }
  }
}
```

### 2. Organize by Feature

Group related translations together:

```typescript
const messages = {
  "en": {
    "auth": {
      "login": "Login",
      "logout": "Logout",
      "register": "Register"
    },
    "dashboard": {
      "title": "Dashboard",
      "welcome": "Welcome"
    }
  }
}
```

### 3. Leverage Instructions

Use file-level or key-level instructions for better translation quality:

```yaml
files:
  ts:
    include:
      - "src/i18n.ts"
    fileInstructions:
      - path: "src/i18n.ts"
        instruction: "Customer-facing messages, friendly tone"
        keyInstructions:
          - path: "*/errors/*"
            instruction: "Error messages should be clear and actionable"
```

### 4. Lock Placeholders and Constants

Prevent translation of constants and placeholders:

```yaml
files:
  ts:
    lockedKeys:
      - "*/common/app_name"
      - "*/common/version"
      - "*/api/*"
```

### 5. Preserve Code Structure

Lara Dev preserves everything outside the `messages` object. You can safely include:

- Import statements
- Type definitions
- Helper functions
- Configuration objects
- Comments

```typescript
import { createI18n } from 'vue-i18n'

// Translation messages
const messages = {
  // ... translations
}

// i18n configuration
const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages,
})

export default i18n
```

## Limitations

### File Format Requirements

- ✅ Must contain `const messages = {...}` pattern
- ✅ The messages object must be valid JavaScript/TypeScript object syntax
- ✅ Supports nested objects and arrays
- ❌ Does not support TypeScript type annotations inside the messages object (use `as const` or type assertions if needed)

### Supported Patterns

- ✅ Single file with all locales: `src/i18n.ts`
- ✅ Locale-based files: `src/i18n/[locale].ts`
- ❌ Files without the `const messages =` pattern are not supported

### Fallback Content

If Lara Dev needs to create a new TS file and cannot find an existing one, it will use this fallback:

```typescript
const messages = {};

export default messages;
```

## Troubleshooting

### Messages Object Not Found

If Lara Dev cannot find the `messages` object:

- Ensure your file contains `const messages =` (exact pattern)
- Check that the object syntax is valid JavaScript/TypeScript
- Verify the file is not empty or corrupted

### Formatting Changes

Lara Dev preserves your original formatting. If you notice changes:

- Ensure your source file is properly formatted
- The parser uses JSON.stringify with 4-space indentation for the messages object
- Other code in the file remains unchanged

### Locale Keys Not Recognized

If translations aren't being applied:

- Verify your locale codes match the keys in your `messages` object
- Check that the source locale exists in your messages object
- Ensure the file path in `lara.yaml` matches your actual file location

### Nested Keys

Lara Dev uses `/` as the delimiter for nested keys. When specifying `lockedKeys` or `ignoredKeys`, use this format:

```yaml
lockedKeys:
  - "en/nav/home"           # Specific key
  - "**/common/**"            # All common keys in all locales
  - "en/dashboard/stats/*"  # All stats keys in English
```

## Related Documentation

- [Supported Formats](./formats.md) - Overview of all supported file formats
- [Files Configuration](./files.md) - General file configuration options
- [Instructions](./instructions.md) - How to use translation instructions
- [Locales](./locales.md) - Supported locale codes
