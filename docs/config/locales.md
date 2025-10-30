---
title: Locales Configuration
sidebar_position: 3
---

# Locales Configuration

The `locales` section defines the source and target languages for translation.

## Configuration

```yaml
locales:
  source: en
  target:
    - es
    - fr
    - de
```

## Properties

### source

- **Type**: String (locale code)
- **Required**: Yes
- **Description**: Defines the source locale from which content will be translated
- **Example**: `en` (English), `fr` (French), `de` (German)

### target

- **Type**: Array of strings (locale codes)
- **Required**: Yes
- **Description**: Lists the target locales to which content will be translated
- **Example**: 
  ```yaml
  target:
    - es
    - fr
    - ja
  ```

## Examples

### Single Target Locale

```yaml
locales:
  source: en
  target:
    - es
```

### Multiple Target Locales

```yaml
locales:
  source: en
  target:
    - es
    - fr
    - de
    - ja
```

### Non-English Source

```yaml
locales:
  source: fr
  target:
    - en
    - es
    - it
```

## Supported Locales

Lara CLI supports translations using different locale codes, following two main standards:

### ISO 639-1 Language Codes
These are basic language identifiers (e.g., `en` for English, `fr` for French) that apply to all regions where the language is spoken.

| Code  | Language            | Code  | Language            |
|-------|---------------------|-------|---------------------|
| ar    | Arabic              | de    | German              |
| bg    | Bulgarian           | el    | Greek               |
| ca    | Catalan             | en    | English             |
| cs    | Czech               | es    | Spanish             |
| da    | Danish              | fi    | Finnish             |
| fr    | French              | he    | Hebrew              |
| hr    | Croatian            | hu    | Hungarian           |
| id    | Indonesian          | it    | Italian             |
| ja    | Japanese            | ko    | Korean              |
| ms    | Malay               | nb    | Norwegian Bokmål    |
| nl    | Dutch               | pl    | Polish              |
| pt    | Portuguese          | ru    | Russian             |
| sk    | Slovak              | sv    | Swedish             |
| th    | Thai                | tr    | Turkish             |
| uk    | Ukrainian           | zh    | Chinese             |


### BCP 47 Language Tags
These are standardized language tags defined by BCP 47, combining ISO 639-1 language codes with ISO 3166-1 country codes (e.g., `en-US` for English in the United States, `fr-CA` for French in Canada). They provide more precise regional context.

| Code     | Language & Region                    | Code     | Language & Region                    |
|----------|--------------------------------------|----------|--------------------------------------|
| ar-SA    | Arabic (Saudi Arabia)                | en-AU    | English (Australia)                  |
| bg-BG    | Bulgarian (Bulgaria)                 | en-CA    | English (Canada)                     |
| ca-ES    | Catalan (Spain)                      | en-GB    | English (United Kingdom)             |
| cs-CZ    | Czech (Czech Republic)               | en-IE    | English (Ireland)                    |
| da-DK    | Danish (Denmark)                     | en-US    | English (United States)              |
| de-DE    | German (Germany)                     | es-419   | Spanish (Latin America)              |
| el-GR    | Greek (Greece)                       | es-AR    | Spanish (Argentina)                  |
| fi-FI    | Finnish (Finland)                    | es-ES    | Spanish (Spain)                      |
| fr-CA    | French (Canada)                      | es-MX    | Spanish (Mexico)                     |
| he-IL    | Hebrew (Israel)                      | fr-FR    | French (France)                      |
| hr-HR    | Croatian (Croatia)                   | hu-HU    | Hungarian (Hungary)                  |
| id-ID    | Indonesian (Indonesia)               | it-IT    | Italian (Italy)                      |
| ja-JP    | Japanese (Japan)                     | ko-KR    | Korean (South Korea)                 |
| ms-MY    | Malay (Malaysia)                     | nb-NO    | Norwegian Bokmål (Norway)            |
| nl-BE    | Dutch (Belgium)                      | nl-NL    | Dutch (Netherlands)                  |
| pl-PL    | Polish (Poland)                      | pt-BR    | Portuguese (Brazil)                  |
| pt-PT    | Portuguese (Portugal)                | ru-RU    | Russian (Russia)                     |
| sk-SK    | Slovak (Slovakia)                    | sv-SE    | Swedish (Sweden)                     |
| th-TH    | Thai (Thailand)                      | tr-TR    | Turkish (Turkey)                     |
| uk-UA    | Ukrainian (Ukraine)                  | zh-CN    | Chinese (China)                      |
| zh-HK    | Chinese (Hong Kong)                  | zh-TW    | Chinese (Taiwan)                     |
