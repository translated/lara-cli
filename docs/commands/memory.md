# Memory Command

The `memory` command lists all Translation Memories available in your Lara account. Translation Memories enable Lara to adapt translations to your specific style and terminology.

## Usage

```bash
lara-dev memory [options]
```

## Options

| Option | Description |
|--------|-------------|
| `-h, --help` | Display help information |

## Example Output

```bash
ℹ Legal Terminology - English to Spanish
ℹ Medical Terms Database
ℹ Marketing Brand Voice
```

## Prerequisites

Before using the memory command:

1. Set up your Lara API credentials in a `.env` file:
   ```
   LARA_ACCESS_KEY_ID=your_access_key_id
   LARA_ACCESS_KEY_SECRET=your_access_key_secret
   ```

2. Have at least one Translation Memory created in your Lara account

## Using Translation Memories

After identifying available Translation Memories, you can:

1. **During initialization**: Add memories when running `lara-dev init`
   ```bash
   lara-dev init
   # You'll be prompted to select Translation Memories
   ```

2. **Non-interactive initialization**: Specify memories directly
   ```bash
   lara-dev init --translation-memories "mem_123abc, mem_456def" --non-interactive
   ```

3. **Manual configuration**: Add to your `lara.yaml` file
   ```yaml
   memories:
     - mem_123abc
     - mem_456def
   ```

## Related

- [Translation Memories Configuration](../config/memories.md) - Detailed configuration options
