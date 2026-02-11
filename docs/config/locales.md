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

Lara CLI supports translations using different locale codes, following three main standards:

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
| gn    | Guaraní             | gu    | Gujarati            |
| ha    | Hausa               | he    | Hebrew              |
| hi    | Hindi               | hr    | Croatian            |
| ht    | Haitian Creole      | hu    | Hungarian           |
| hy    | Armenian            | id    | Indonesian          |
| ig    | Igbo                | is    | Icelandic           |
| it    | Italian             | ja    | Japanese            |
| jv    | Javanese            | ka    | Georgian            |
| kg    | Kongo               | ki    | Kikuyu              |
| kk    | Kazakh              | km    | Khmer               |
| kn    | Kannada             | ko    | Korean              |
| ks    | Kashmiri            | ky    | Kyrgyz              |
| la    | Latin               | lb    | Luxembourgish       |
| lg    | Luganda             | li    | Limburgish          |
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
| pt    | Portuguese          | rn    | Kirundi             |
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
| cjk   | Chokwe                  | ckb   | Kurdish Sorani          |
| crh   | Crimean Tatar           | dik   | Dinka                   |
| diq   | Dimli                   | dyu   | Dyula                   |
| fil   | Filipino                | fon   | Fon                     |
| fur   | Friulian                | fuv   | Nigerian Fulfulde       |
| gaz   | West Central Oromo      | hne   | Chhattisgarhi           |
| ilo   | Iloko                   | kab   | Kabyle                  |
| kac   | Jingpho                 | kam   | Kamba                   |
| kas   | Kashmiri                | kbp   | Kabiyè                  |
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
| tum   | Tumbuka                 | tzm   | Central Atlas Tamazight |
| umb   | Umbundu                 | uzn   | Uzbek                   |
| vec   | Venetian                | vls   | West Flemish            |
| war   | Waray                   | ydd   | Yiddish                 |

### BCP 47 Language Tags

These are standardized language tags defined by BCP 47, combining ISO 639-1 language codes with ISO 3166-1 country codes (e.g., `en-US` for English in the United States, `fr-CA` for French in Canada). They provide more precise regional context.

| Code        | Language & Region                    | Code        | Language & Region                    |
|-------------|--------------------------------------|-------------|--------------------------------------|
| ace-ID      | Acehnese (Indonesia)                 | af-ZA       | Afrikaans (South Africa)             |
| ak-GH       | Akan (Ghana)                         | als-AL      | Tosk Albanian (Albania)              |
| am-ET       | Amharic (Ethiopia)                   | ar-SA       | Arabic (Saudi Arabia)                |
| as-IN       | Assamese (India)                     | ast-ES      | Asturian (Spain)                     |
| awa-IN      | Awadhi (India)                       | ayr-BO      | Central Aymara (Bolivia)             |
| az-AZ       | Azerbaijani (Azerbaijan)             | azb-AZ      | South Azerbaijani (Azerbaijan)       |
| ba-RU       | Bashkir (Russia)                     | ban-ID      | Balinese (Indonesia)                 |
| be-BY       | Belarusian (Belarus)                 | bem-ZM      | Bemba (Zambia)                       |
| bg-BG       | Bulgarian (Bulgaria)                 | bho-IN      | Bhojpuri (India)                     |
| bjn-ID      | Banjar (Indonesia)                   | bm-ML       | Bambara (Mali)                       |
| bn-BD       | Bengali (Bangladesh)                 | bo-CN       | Tibetan (China)                      |
| bs-BA       | Bosnian (Bosnia and Herzegovina)     | bug-ID      | Buginese (Indonesia)                 |
| ca-ES       | Catalan (Spain)                      | ceb-PH      | Cebuano (Philippines)                |
| cjk-AO      | Chokwe (Angola)                      | ckb-IQ      | Kurdish Sorani (Iraq)                |
| crh-RU      | Crimean Tatar (Russia)               | cs-CZ       | Czech (Czech Republic)               |
| cy-GB       | Welsh (United Kingdom)               | da-DK       | Danish (Denmark)                     |
| de-DE       | German (Germany)                     | dik-SS      | Dinka (South Sudan)                  |
| diq-TR      | Dimli (Turkey)                       | dyu-CI      | Dyula (Côte d'Ivoire)                |
| dz-BT       | Dzongkha (Bhutan)                    | ee-GH       | Ewe (Ghana)                          |
| el-GR       | Greek (Greece)                       | en-AU       | English (Australia)                  |
| en-CA       | English (Canada)                     | en-GB       | English (United Kingdom)             |
| en-IE       | English (Ireland)                    | en-US       | English (United States)              |
| eo-EU       | Esperanto (Europe)                   | es-419      | Spanish (Latin America)              |
| es-AR       | Spanish (Argentina)                  | es-ES       | Spanish (Spain)                      |
| es-MX       | Spanish (Mexico)                     | et-EE       | Estonian (Estonia)                   |
| eu-ES       | Basque (Spain)                       | fa-IR       | Persian (Iran)                       |
| fi-FI       | Finnish (Finland)                    | fil-PH      | Filipino (Philippines)               |
| fj-FJ       | Fijian (Fiji)                        | fo-FO       | Faroese (Faroe Islands)              |
| fon-BJ      | Fon (Benin)                          | fr-CA       | French (Canada)                      |
| fr-FR       | French (France)                      | fur-IT      | Friulian (Italy)                     |
| fuv-NG      | Nigerian Fulfulde (Nigeria)          | ga-IE       | Irish (Ireland)                      |
| gaz-ET      | West Central Oromo (Ethiopia)        | gd-GB       | Scottish Gaelic (United Kingdom)     |
| gl-ES       | Galician (Spain)                     | gn-PY       | Guaraní (Paraguay)                   |
| gu-IN       | Gujarati (India)                     | ha-NE       | Hausa (Niger)                        |
| he-IL       | Hebrew (Israel)                      | hi-IN       | Hindi (India)                        |
| hne-IN      | Chhattisgarhi (India)                | hr-HR       | Croatian (Croatia)                   |
| ht-HT       | Haitian Creole (Haiti)               | hu-HU       | Hungarian (Hungary)                  |
| hy-AM       | Armenian (Armenia)                   | id-ID       | Indonesian (Indonesia)               |
| ig-NG       | Igbo (Nigeria)                       | ilo-PH      | Iloko (Philippines)                  |
| is-IS       | Icelandic (Iceland)                  | it-IT       | Italian (Italy)                      |
| ja-JP       | Japanese (Japan)                     | jv-ID       | Javanese (Indonesia)                 |
| ka-GE       | Georgian (Georgia)                   | kab-DZ      | Kabyle (Algeria)                     |
| kac-MM      | Jingpho (Myanmar)                    | kam-KE      | Kamba (Kenya)                        |
| kas-IN      | Kashmiri (India)                     | kbp-TG      | Kabiyè (Togo)                        |
| kea-CV      | Kabuverdianu (Cape Verde)            | kg-CG       | Kongo (Congo)                        |
| khk-MN      | Halh Mongolian (Mongolia)            | ki-KE       | Kikuyu (Kenya)                       |
| kk-KZ       | Kazakh (Kazakhstan)                  | km-KH       | Khmer (Cambodia)                     |
| kmb-AO      | Kimbundu (Angola)                    | kmr-TR      | Northern Kurdish (Turkey)            |
| kn-IN       | Kannada (India)                      | knc-NG      | Central Kanuri (Nigeria)             |
| ko-KR       | Korean (South Korea)                 | ks-IN       | Kashmiri (India)                     |
| ky-KG       | Kyrgyz (Kyrgyzstan)                  | la-VA       | Latin (Vatican)                      |
| lb-LU       | Luxembourgish (Luxembourg)           | lg-UG       | Luganda (Uganda)                     |
| li-NL       | Limburgish (Netherlands)             | lij-IT      | Ligurian (Italy)                     |
| lmo-IT      | Lombard (Italy)                      | ln-CD       | Lingala (Congo)                      |
| lo-LA       | Lao (Laos)                           | lt-LT       | Lithuanian (Lithuania)               |
| ltg-LV      | Latgalian (Latvia)                   | lua-CD      | Luba-Lulua (Congo)                   |
| luo-KE      | Luo (Kenya)                          | lus-IN      | Mizo (India)                         |
| lv-LV       | Latvian (Latvia)                     | mag-IN      | Magahi (India)                       |
| mai-IN      | Maithili (India)                     | mg-MG       | Malagasy (Madagascar)                |
| mi-NZ       | Maori (New Zealand)                  | min-ID      | Minangkabau (Indonesia)              |
| mk-MK       | Macedonian (North Macedonia)         | ml-IN       | Malayalam (India)                    |
| mn-MN       | Mongolian (Mongolia)                 | mni-IN      | Manipuri (India)                     |
| mos-BF      | Mossi (Burkina Faso)                 | mr-IN       | Marathi (India)                      |
| ms-MY       | Malay (Malaysia)                     | mt-MT       | Maltese (Malta)                      |
| my-MM       | Burmese (Myanmar)                    | nb-NO       | Norwegian Bokmål (Norway)            |
| ne-NP       | Nepali (Nepal)                       | nl-BE       | Dutch (Belgium)                      |
| nl-NL       | Dutch (Netherlands)                  | nso-ZA      | Northern Sotho (South Africa)        |
| nus-SS      | Nuer (South Sudan)                   | ny-MW       | Nyanja (Malawi)                      |
| oc-FR       | Occitan (France)                     | or-IN       | Odia (India)                         |
| pa-IN       | Punjabi (India)                      | pag-PH      | Pangasinan (Philippines)             |
| pap-CW      | Papiamento (Curaçao)                 | pbt-PK      | Southern Pashto (Pakistan)           |
| pl-PL       | Polish (Poland)                      | plt-MG      | Plateau Malagasy (Madagascar)        |
| prs-AF      | Dari (Afghanistan)                   | ps-PK       | Pashto (Pakistan)                    |
| pt-BR       | Portuguese (Brazil)                  | pt-PT       | Portuguese (Portugal)                |
| quy-PE      | Ayacucho Quechua (Peru)              | rn-BI       | Kirundi (Burundi)                    |
| ro-RO       | Romanian (Romania)                   | ru-RU       | Russian (Russia)                     |
| rw-RW       | Kinyarwanda (Rwanda)                 | sa-IN       | Sanskrit (India)                     |
| sat-IN      | Santali (India)                      | sc-IT       | Sardinian (Italy)                    |
| scn-IT      | Sicilian (Italy)                     | sd-PK       | Sindhi (Pakistan)                    |
| sg-CF       | Sango (Central African Republic)     | shn-MM      | Shan (Myanmar)                       |
| si-LK       | Sinhala (Sri Lanka)                  | sk-SK       | Slovak (Slovakia)                    |
| sl-SI       | Slovenian (Slovenia)                 | sm-WS       | Samoan (Samoa)                       |
| sn-ZW       | Shona (Zimbabwe)                     | so-SO       | Somali (Somalia)                     |
| sq-AL       | Albanian (Albania)                   | sr-Cyrl-RS  | Serbian (Cyrillic, Serbia)           |
| sr-Latn-RS  | Serbian (Latin, Serbia)              | ss-SZ       | Swati (Eswatini)                     |
| st-LS       | Southern Sotho (Lesotho)             | su-ID       | Sundanese (Indonesia)                |
| sv-SE       | Swedish (Sweden)                     | sw-KE       | Swahili (Kenya)                      |
| szl-PL      | Silesian (Poland)                    | ta-IN       | Tamil (India)                        |
| taq-ML      | Tamasheq (Mali)                      | te-IN       | Telugu (India)                       |
| tg-TJ       | Tajik (Tajikistan)                   | th-TH       | Thai (Thailand)                      |
| ti-ET       | Tigrinya (Ethiopia)                  | tk-TM       | Turkmen (Turkmenistan)               |
| tl-PH       | Tagalog (Philippines)                | tn-ZA       | Tswana (South Africa)                |
| tpi-PG      | Tok Pisin (Papua New Guinea)         | tr-TR       | Turkish (Turkey)                     |
| ts-ZA       | Tsonga (South Africa)                | tt-RU       | Tatar (Russia)                       |
| tum-MW      | Tumbuka (Malawi)                     | tw-GH       | Twi (Ghana)                          |
| tzm-MA      | Central Atlas Tamazight (Morocco)    | ug-CN       | Uyghur (China)                       |
| uk-UA       | Ukrainian (Ukraine)                  | umb-AO      | Umbundu (Angola)                     |
| ur-PK       | Urdu (Pakistan)                      | uzn-UZ      | Uzbek (Uzbekistan)                   |
| vec-IT      | Venetian (Italy)                     | vi-VN       | Vietnamese (Vietnam)                 |
| vls-BE      | West Flemish (Belgium)               | war-PH      | Waray (Philippines)                  |
| wo-SN       | Wolof (Senegal)                      | xh-ZA       | Xhosa (South Africa)                 |
| ydd-US      | Yiddish (United States)              | yo-NG       | Yoruba (Nigeria)                     |
| zh-CN       | Chinese (Simplified, China)          | zh-HK       | Chinese (Traditional, Hong Kong)     |
| zh-TW       | Chinese (Traditional, Taiwan)        | zu-ZA       | Zulu (South Africa)                  |
