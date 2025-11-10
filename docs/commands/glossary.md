# Glossary Command

The `glossary` command lists all Glossaries available in your Lara account. Glossaries ensure consistent and accurate translations for domain-specific terminology.

## Usage

```bash
lara-dev glossary [options]
```

## Options

| Option | Description |
|--------|-------------|
| `-h, --help` | Display help information |

## Example Output

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

Before using the glossary command:

1. Set up your Lara API credentials in a `.env` file:
   ```
   LARA_ACCESS_KEY_ID=your_access_key_id
   LARA_ACCESS_KEY_SECRET=your_access_key_secret
   ```

2. Have at least one Glossary created in your Lara account

## Using Glossaries

After identifying available Glossaries, you can:

1. **During initialization**: Add glossaries when running `lara-dev init`
   ```bash
   lara-dev init
   # You'll be prompted to select Glossaries
   ```

2. **Non-interactive initialization**: Specify glossaries directly
   ```bash
   lara-dev init --glossaries "gls_abc123, gls_def456" --non-interactive
   ```

3. **Manual configuration**: Add to your `lara.yaml` file
   ```yaml
   glossaries:
     - gls_abc123
     - gls_def456
   ```

## Related

- [Glossaries Configuration](../config/glossaries.md) - Detailed configuration options
