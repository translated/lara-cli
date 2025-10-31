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

Lara Dev supports translations using different locale codes, following three main standards:

### ISO 639-1 Language Codes
These are two-letter language identifiers (e.g., `en` for English, `fr` for French) that apply to all regions where the language is spoken.

| Code  | Language            | Code  | Language            |
|-------|---------------------|-------|---------------------|
| af    | Afrikaans           | ak    | Akan                |
| am    | Amharic             | ar    | Arabic              |
| as    | Assamese            | az    | Azerbaijani         |
| ba    | Bashkir             | be    | Belarusian          |
| bg    | Bulgarian           | bm    | Bambara             |
| bn    | Bengali             | bo    | Tibetan             |
| bs    | Bosnian             | ca    | Catalan             |
| cs    | Czech               | cy    | Welsh               |
| da    | Danish              | de    | German              |
| dz    | Dzongkha            | ee    | Ewe                 |
| el    | Greek               | en    | English             |
| eo    | Esperanto           | es    | Spanish             |
| et    | Estonian            | eu    | Basque              |
| fa    | Persian             | fi    | Finnish             |
| fj    | Fijian              | fo    | Faroese             |
| fr    | French              | ga    | Irish               |
| gd    | Scottish Gaelic     | gl    | Galician            |
| gn    | Guarani             | gu    | Gujarati            |
| ha    | Hausa               | he    | Hebrew              |
| hi    | Hindi               | hr    | Croatian            |
| ht    | Haitian             | hu    | Hungarian           |
| hy    | Armenian            | id    | Indonesian          |
| ig    | Igbo                | is    | Icelandic           |
| it    | Italian             | ja    | Japanese            |
| jv    | Javanese            | ka    | Georgian            |
| kg    | Kongo               | ki    | Kikuyu              |
| kk    | Kazakh              | km    | Khmer               |
| kn    | Kannada             | ko    | Korean              |
| ks    | Devanagari Kashmiri | ky    | Kyrgyz              |
| la    | Latin               | lb    | Luxembourgish       |
| lg    | Ganda               | li    | Limburgish          |
| ln    | Lingala             | lo    | Lao                 |
| lt    | Lithuanian          | lv    | Latvian             |
| mg    | Malagasy            | mi    | Maori               |
| mk    | Macedonian          | ml    | Malayalam           |
| mn    | Mongolian           | mr    | Marathi             |
| ms    | Malay               | mt    | Maltese             |
| my    | Burmese             | nb    | Norwegian Bokmål    |
| ne    | Nepali              | nl    | Dutch               |
| ny    | Nyanja              | oc    | Occitan             |
| or    | Odia                | pa    | Punjabi             |
| pl    | Polish              | ps    | Pashto              |
| pt    | Portuguese          | rn    | Rundi               |
| ro    | Romanian            | ru    | Russian             |
| rw    | Kinyarwanda         | sa    | Sanskrit            |
| sc    | Sardinian           | sd    | Sindhi              |
| sg    | Sango               | si    | Sinhala             |
| sk    | Slovak              | sl    | Slovenian           |
| sm    | Samoan              | sn    | Shona               |
| so    | Somali              | sq    | Albanian            |
| sr    | Serbian             | ss    | Swati               |
| st    | Southern Sotho      | su    | Sundanese           |
| sv    | Swedish             | sw    | Swahili             |
| ta    | Tamil               | te    | Telugu              |
| tg    | Tajik               | th    | Thai                |
| ti    | Tigrinya            | tk    | Turkmen             |
| tl    | Tagalog             | tn    | Tswana              |
| tr    | Turkish             | ts    | Tsonga              |
| tt    | Tatar               | tw    | Twi                 |
| ug    | Uyghur              | uk    | Ukrainian           |
| ur    | Urdu                | vi    | Vietnamese          |
| wo    | Wolof               | xh    | Xhosa               |
| yo    | Yoruba              | zh    | Chinese             |
| zu    | Zulu                |       |                     |


### ISO 639-3 Language Codes
These are three-letter language identifiers that provide more specific language classification.

| Code  | Language                | Code  | Language                |
|-------|-------------------------|-------|-------------------------|
| ace   | Acehnese                | als   | Tosk Albanian           |
| ast   | Asturian                | awa   | Awadhi                  |
| ayr   | Central Aymara          | azb   | South Azerbaijani       |
| ban   | Balinese                | bem   | Bemba                   |
| bho   | Bhojpuri                | bjn   | Banjar                  |
| bug   | Buginese                | ceb   | Cebuano                 |
| cjk   | Chokwe                  | ckb   | Central Kurdish         |
| crh   | Crimean Tatar           | dik   | Dinka                   |
| diq   | Dimli                   | dyu   | Dyula                   |
| fil   | Filipino                | fon   | Fon                     |
| fur   | Friulian                | fuv   | Nigerian Fulfulde       |
| gaz   | West Central Oromo      | hne   | Chhattisgarhi           |
| ilo   | Iloko                   | kab   | Kabyle                  |
| kac   | Jingpho                 | kam   | Kamba                   |
| kas   | Arabic Kashmiri         | kbp   | Kabiyè                  |
| kea   | Kabuverdianu            | khk   | Halh Mongolian          |
| kmb   | Kimbundu                | kmr   | Northern Kurdish        |
| knc   | Central Kanuri          | lij   | Ligurian                |
| lmo   | Lombard                 | ltg   | Latgalian               |
| lua   | Luba-Lulua              | luo   | Luo                     |
| lus   | Mizo                    | mag   | Magahi                  |
| mai   | Maithili                | min   | Minangkabau             |
| mni   | Manipuri                | mos   | Mossi                   |
| nso   | Northern Sotho          | nus   | Nuer                    |
| pag   | Pangasinan              | pap   | Papiamento              |
| pbt   | Southern Pashto         | plt   | Plateau Malagasy        |
| prs   | Dari                    | quy   | Ayacucho Quechua        |
| sat   | Santali                 | scn   | Sicilian                |
| shn   | Shan                    | szl   | Silesian                |
| taq   | Tamasheq                | tpi   | Tok Pisin               |
| tum   | Tumbuka                 | tzm   | Tamazight               |
| umb   | Umbundu                 | uzn   | Uzbek                   |
| vec   | Venetian                | vls   | West Flemish            |
| war   | Waray                   | ydd   | Yiddish                 |


### BCP 47 Language Tags
These are standardized language tags defined by BCP 47, combining ISO 639-1 language codes with ISO 3166-1 country codes (e.g., `en-US` for English in the United States, `fr-CA` for French in Canada). They provide more precise regional context.

| Code     | Language & Region                    |
|----------|--------------------------------------|
| en-GB    | English (United Kingdom)             |
| en-US    | English (United States)              |
| pt-BR    | Portuguese (Brazil)                  |
| pt-PT    | Portuguese (Portugal)                |
| zh-CN    | Chinese (Simplified)                 |
| zh-TW    | Chinese (Traditional)                |
