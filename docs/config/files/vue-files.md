# Vue Files Configuration

This guide explains how to use Lara CLI with Vue Single File Components (`.vue` files) that contain i18n blocks for internationalization.

## What are Vue Files?

Vue Single File Components (SFCs) are `.vue` files that contain template, script, and style blocks. Lara CLI supports Vue files that include `<i18n>` blocks for storing translation messages directly within component files.

This approach is commonly used with:

- Vue.js applications using vue-i18n
- Vue 3 Composition API projects
- Component-scoped translations
- Vue I18n single-file component support

Lara CLI extracts and manages the JSON content from `<i18n>` blocks in Vue SFC files while preserving the rest of the component structure.

## Configuration

To configure Vue files in your `lara.yaml`:

```yaml
files:
  vue:
    include:
      - "src/components/**/*.vue"
      - "src/views/**/*.vue"
    exclude: []
    lockedKeys: []
    ignoredKeys: []
```

### File Path Patterns

Vue files can be configured using glob patterns. Unlike other formats, Vue files **do not require** the `[locale]` placeholder because translations are stored within each component file.

#### Component-Based Pattern (Recommended)

Include all Vue components that contain i18n blocks:

```yaml
files:
  vue:
    include:
      - "src/components/**/*.vue"
      - "src/views/**/*.vue"
      - "src/pages/**/*.vue"
```

#### Specific Files Pattern

Target specific Vue files:

```yaml
files:
  vue:
    include:
      - "src/components/Header.vue"
      - "src/components/Footer.vue"
      - "src/views/HomePage.vue"
```

## Vue File Structure

### Required Format

Lara CLI expects Vue files to contain an `<i18n>` block with valid JSON:

```vue
<template>
  <div>
    <h1>{{ $t('hello') }}</h1>
  </div>
</template>

<script setup>
// Component logic
</script>

<i18n>
{
  "en": {
    "hello": "Hello World"
  }
}
</i18n>
```

The parser extracts the JSON content from the `<i18n>` block and processes it for translation.

### Single Locale Structure

A Vue component with translations for a single locale:

```vue
<template>
  <div>
    <h1>{{ $t('welcome.title') }}</h1>
    <p>{{ $t('welcome.description') }}</p>
    <button>{{ $t('buttons.submit') }}</button>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<i18n>
{
  "en": {
    "welcome": {
      "title": "Welcome to our application",
      "description": "This is a demo component"
    },
    "buttons": {
      "submit": "Submit",
      "cancel": "Cancel"
    }
  }
}
</i18n>
```

### Multiple Locales Structure

A Vue component with translations for multiple locales:

```vue
<template>
  <div>
    <h1>{{ $t('nav.home') }}</h1>
    <p>{{ $t('nav.about') }}</p>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<i18n>
{
  "en": {
    "nav": {
      "home": "Home",
      "about": "About us",
      "services": "Services",
      "contacts": "Contact"
    }
  },
  "it": {
    "nav": {
      "home": "Home",
      "about": "Chi siamo",
      "services": "Servizi",
      "contacts": "Contatti"
    }
  },
  "es": {
    "nav": {
      "home": "Inicio",
      "about": "Acerca de",
      "services": "Servicios",
      "contacts": "Contacto"
    }
  }
}
</i18n>
```

### Nested Structure

Lara CLI supports deeply nested translation structures:

```vue
<i18n>
{
  "en": {
    "common": {
      "buttons": {
        "submit": "Submit",
        "cancel": "Cancel",
        "delete": "Delete"
      }
    },
    "dashboard": {
      "title": "Dashboard",
      "welcome": "Welcome back",
      "stats": {
        "users": "Users",
        "revenue": "Revenue",
        "orders": "Orders"
      }
    }
  }
}
</i18n>
```

## How Lara CLI Handles Vue Files

### Automatic Processing

Lara CLI automatically:

- ✅ Extracts the JSON content from `<i18n>` blocks
- ✅ Preserves the Vue SFC structure (template, script, style blocks)
- ✅ Handles locale-prefixed keys (e.g., `en/nav/home`, `it/nav/home`)
- ✅ Maintains nested object structures
- ✅ Preserves formatting and indentation of non-i18n content
- ✅ Creates `<i18n>` blocks if they don't exist

### Key Path Format

When using `lockedKeys` or `ignoredKeys` with Vue files, use the flattened key path format:

```yaml
files:
  vue:
    include:
      - "src/components/**/*.vue"
    lockedKeys:
      - "en/nav/home"        # Specific locale key
      - "*/common/buttons/*" # Wildcard pattern
    ignoredKeys:
      - "*/debug/*"          # Ignore all debug keys
```

The delimiter `/` is used to separate nested keys, and locale prefixes are included when specifying keys.

### i18n Block Placement

The `<i18n>` block can be placed anywhere in the Vue file. Lara CLI will:

- Extract content from existing `<i18n>` blocks
- Create new `<i18n>` blocks if they don't exist (placed after `</template>` or at the end of the file)
- Preserve the block's position when updating translations

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
  vue:
    include:
      - "src/components/**/*.vue"
      - "src/views/**/*.vue"
    exclude:
      - "src/components/test/**/*.vue"
    lockedKeys:
      - "**/common/brand_name"
      - "**/common/version"
    ignoredKeys:
      - "**/debug/**"
      - "**/test/**"
    fileInstructions:
      - path: "src/components/Header.vue"
        instruction: "Navigation menu, keep concise"
        keyInstructions:
          - path: "**/errors/**"
            instruction: "Error messages should be clear and helpful"
```

## Working with Existing Vue Files

If you already have Vue files with i18n blocks:

1. **Run `lara-cli init`** to create your configuration
2. **Ensure your Vue files contain `<i18n>` blocks with valid JSON**
3. **Run `lara-cli translate`**
4. **Continue developing** - Lara CLI tracks changes via checksums and only translates what's new or modified

If your Vue files don't have i18n blocks yet:

1. **Run `lara-cli translate`** - Lara CLI will create `<i18n>` blocks automatically
2. **The blocks will be added with the appropriate structure**

## Best Practices

### 1. Use Consistent Structure

Keep the same key structure across all locales in your i18n blocks:

```vue
<i18n>
{
  "en": {
    "nav": { "home": "Home" },
    "home": { "title": "Welcome" }
  },
  "it": {
    "nav": { "home": "Home" },      // ✅ Same structure
    "home": { "title": "Benvenuto" }
  }
}
</i18n>
```

### 2. Organize by Feature

Group related translations together:

```vue
<i18n>
{
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
</i18n>
```

### 3. Component-Scoped Translations

Use i18n blocks for component-specific translations:

```vue
<template>
  <div class="product-card">
    <h3>{{ $t('product.name') }}</h3>
    <p>{{ $t('product.description') }}</p>
    <button>{{ $t('product.addToCart') }}</button>
  </div>
</template>

<i18n>
{
  "en": {
    "product": {
      "name": "Product Name",
      "description": "Product description",
      "addToCart": "Add to Cart"
    }
  }
}
</i18n>
```

### 4. Leverage Instructions

Use file-level or key-level instructions for better translation quality:

```yaml
files:
  vue:
    include:
      - "src/components/**/*.vue"
    fileInstructions:
      - path: "src/components/Header.vue"
        instruction: "Navigation menu, customer-facing, friendly tone"
        keyInstructions:
          - path: "*/errors/*"
            instruction: "Error messages should be clear and actionable"
```

### 5. Lock Placeholders and Constants

Prevent translation of constants and placeholders:

```yaml
files:
  vue:
    lockedKeys:
      - "*/common/app_name"
      - "*/common/version"
      - "*/api/*"
```

### 6. Preserve Component Structure

Lara CLI preserves everything outside the `<i18n>` block. You can safely include:

- Template markup
- Script logic (Composition API, Options API)
- Style blocks (CSS, SCSS, Less)
- Other custom blocks
- Comments

```vue
<template>
  <!-- Your template -->
  <div>{{ $t('hello') }}</div>
</template>

<script setup>
// Your component logic
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<style scoped>
/* Your styles */
.card {
  padding: 1rem;
}
</style>

<i18n>
{
  "en": {
    "hello": "Hello World"
  }
}
</i18n>
```

## Limitations

### File Format Requirements

- ✅ Must contain `<i18n>` block (or will be created automatically)
- ✅ The i18n block must contain valid JSON
- ✅ Supports nested objects
- ✅ Supports multiple locales in a single i18n block
- ❌ Does not support YAML format in i18n blocks (only JSON)
- ❌ Does not support TypeScript type annotations inside the i18n block

### Supported Patterns

- ✅ Component-based glob patterns: `src/components/**/*.vue`
- ✅ Specific file paths: `src/components/Header.vue`
- ✅ Multiple include patterns
- ❌ Vue files without i18n blocks will have them created automatically
- ❌ The `[locale]` placeholder is not required (and not supported) for Vue files

### Fallback Content

If Lara CLI needs to create a new i18n block and cannot find an existing one, it will use this fallback:

```vue
<i18n>
{}
</i18n>
```

The block will be placed after the `</template>` tag or at the end of the file if no template exists.

## Troubleshooting

### i18n Block Not Found

If Lara CLI cannot find the `<i18n>` block:

- Ensure your file contains `<i18n>` tags (case-insensitive)
- Check that the block has both opening `<i18n>` and closing `</i18n>` tags
- Verify the JSON content inside is valid
- Lara CLI will create the block automatically if it doesn't exist

### Invalid JSON in i18n Block

If you get JSON parsing errors:

- Ensure the content between `<i18n>` tags is valid JSON
- Check for trailing commas
- Verify all strings are properly quoted
- Use a JSON validator to check your content

### Formatting Changes

Lara CLI preserves your original formatting for non-i18n content. If you notice changes:

- The i18n block content is formatted with 2-space indentation
- Template, script, and style blocks remain unchanged
- Only the JSON content inside the i18n block is reformatted

### Locale Keys Not Recognized

If translations aren't being applied:

- Verify your locale codes match the keys in your i18n block
- Check that the source locale exists in your i18n block
- Ensure the file path in `lara.yaml` matches your actual file location
- Make sure the component is included in the `include` patterns

### Nested Keys

Lara CLI uses `/` as the delimiter for nested keys. When specifying `lockedKeys` or `ignoredKeys`, use this format:

```yaml
lockedKeys:
  - "en/nav/home"           # Specific key
  - "**/common/**"          # All common keys in all locales
  - "en/dashboard/stats/*" # All stats keys in English
```

### Multiple i18n Blocks

If a Vue file contains multiple `<i18n>` blocks:

- Lara CLI processes the **first** `<i18n>` block found
- Subsequent i18n blocks are preserved but not processed
- Consider consolidating translations into a single i18n block

## Related Documentation

- [Supported Formats](../formats.md) - Overview of all supported file formats
- [Files Configuration](../files.md) - General file configuration options
- [Instructions](../instructions.md) - How to use translation instructions
- [Locales](../locales.md) - Supported locale codes
- [TS Files Guide](./ts-files.md) - Alternative approach using TypeScript files for Vue i18n
