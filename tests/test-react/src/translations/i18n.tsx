import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import all translations
import arTranslation from './ar/ar.json';
import arSATranslation from './ar-SA/ar-SA.json';
import bgTranslation from './bg/bg.json';
import bgBGTranslation from './bg-BG/bg-BG.json';
import caTranslation from './ca/ca.json';
import caESTranslation from './ca-ES/ca-ES.json';
import csTranslation from './cs/cs.json';
import csCZTranslation from './cs-CZ/cs-CZ.json';
import daTranslation from './da/da.json';
import daDKTranslation from './da-DK/da-DK.json';
import deTranslation from './de/de.json';
import deDETranslation from './de-DE/de-DE.json';
import elTranslation from './el/el.json';
import elGRTranslation from './el-GR/el-GR.json';
import enTranslation from './en/en.json';
import enAUTranslation from './en-AU/en-AU.json';
import enCATranslation from './en-CA/en-CA.json';
import enGBTranslation from './en-GB/en-GB.json';
import enIETranslation from './en-IE/en-IE.json';
import enUSTranslation from './en-US/en-US.json';
import esTranslation from './es/es.json';
import es419Translation from './es-419/es-419.json';
import esARTranslation from './es-AR/es-AR.json';
import esESTranslation from './es-ES/es-ES.json';
import esMXTranslation from './es-MX/es-MX.json';
import fiTranslation from './fi/fi.json';
import fiFITranslation from './fi-FI/fi-FI.json';
import frTranslation from './fr/fr.json';
import frCATranslation from './fr-CA/fr-CA.json';
import frFRTranslation from './fr-FR/fr-FR.json';
import heTranslation from './he/he.json';
import heILTranslation from './he-IL/he-IL.json';
import hrTranslation from './hr/hr.json';
import hrHRTranslation from './hr-HR/hr-HR.json';
import huTranslation from './hu/hu.json';
import huHUTranslation from './hu-HU/hu-HU.json';
import idTranslation from './id/id.json';
import idIDTranslation from './id-ID/id-ID.json';
import itTranslation from './it/it.json';
import itITTranslation from './it-IT/it-IT.json';
import jaTranslation from './ja/ja.json';
import jaJPTranslation from './ja-JP/ja-JP.json';
import koTranslation from './ko/ko.json';
import koKRTranslation from './ko-KR/ko-KR.json';
import msTranslation from './ms/ms.json';
import msMYTranslation from './ms-MY/ms-MY.json';
import nbTranslation from './nb/nb.json';
import nbNOTranslation from './nb-NO/nb-NO.json';
import nlTranslation from './nl/nl.json';
import nlBETranslation from './nl-BE/nl-BE.json';
import nlNLTranslation from './nl-NL/nl-NL.json';
import plTranslation from './pl/pl.json';
import plPLTranslation from './pl-PL/pl-PL.json';
import ptTranslation from './pt/pt.json';
import ptBRTranslation from './pt-BR/pt-BR.json';
import ptPTTranslation from './pt-PT/pt-PT.json';
import ruTranslation from './ru/ru.json';
import ruRUTranslation from './ru-RU/ru-RU.json';
import skTranslation from './sk/sk.json';
import skSKTranslation from './sk-SK/sk-SK.json';
import svTranslation from './sv/sv.json';
import svSETranslation from './sv-SE/sv-SE.json';
import thTranslation from './th/th.json';
import thTHTranslation from './th-TH/th-TH.json';
import trTranslation from './tr/tr.json';
import trTRTranslation from './tr-TR/tr-TR.json';
import ukTranslation from './uk/uk.json';
import ukUATranslation from './uk-UA/uk-UA.json';
import zhTranslation from './zh/zh.json';
import zhCNTranslation from './zh-CN/zh-CN.json';
import zhHKTranslation from './zh-HK/zh-HK.json';
import zhTWTranslation from './zh-TW/zh-TW.json';

// Language definitions with flags
export const availableLanguages = {
  ar: { name: "العربية", flag: "🇸🇦" },
  "ar-SA": { name: "العربية (السعودية)", flag: "🇸🇦" },
  bg: { name: "Български", flag: "🇧🇬" },
  "bg-BG": { name: "Български (България)", flag: "🇧🇬" },
  ca: { name: "Català", flag: "🏴󠁥󠁳󠁣󠁴󠁿" },
  "ca-ES": { name: "Català (Espanya)", flag: "🇪🇸" },
  cs: { name: "Čeština", flag: "🇨🇿" },
  "cs-CZ": { name: "Čeština (Česko)", flag: "🇨🇿" },
  da: { name: "Dansk", flag: "🇩🇰" },
  "da-DK": { name: "Dansk (Danmark)", flag: "🇩🇰" },
  de: { name: "Deutsch", flag: "🇩🇪" },
  "de-DE": { name: "Deutsch (Deutschland)", flag: "🇩🇪" },
  el: { name: "Ελληνικά", flag: "🇬🇷" },
  "el-GR": { name: "Ελληνικά (Ελλάδα)", flag: "🇬🇷" },
  en: { name: "English", flag: "🇺🇸" },
  "en-AU": { name: "English (Australia)", flag: "🇦🇺" },
  "en-CA": { name: "English (Canada)", flag: "🇨🇦" },
  "en-GB": { name: "English (UK)", flag: "🇬🇧" },
  "en-IE": { name: "English (Ireland)", flag: "🇮🇪" },
  "en-US": { name: "English (US)", flag: "🇺🇸" },
  es: { name: "Español", flag: "🇪🇸" },
  "es-419": { name: "Español (Latinoamérica)", flag: "🌎" },
  "es-AR": { name: "Español (Argentina)", flag: "🇦🇷" },
  "es-ES": { name: "Español (España)", flag: "🇪🇸" },
  "es-MX": { name: "Español (México)", flag: "🇲🇽" },
  fi: { name: "Suomi", flag: "🇫🇮" },
  "fi-FI": { name: "Suomi (Suomi)", flag: "🇫🇮" },
  fr: { name: "Français", flag: "🇫🇷" },
  "fr-CA": { name: "Français (Canada)", flag: "🇨🇦" },
  "fr-FR": { name: "Français (France)", flag: "🇫🇷" },
  he: { name: "עברית", flag: "🇮🇱" },
  "he-IL": { name: "עברית (ישראל)", flag: "🇮🇱" },
  hr: { name: "Hrvatski", flag: "🇭🇷" },
  "hr-HR": { name: "Hrvatski (Hrvatska)", flag: "🇭🇷" },
  hu: { name: "Magyar", flag: "🇭🇺" },
  "hu-HU": { name: "Magyar (Magyarország)", flag: "🇭🇺" },
  id: { name: "Bahasa Indonesia", flag: "🇮🇩" },
  "id-ID": { name: "Bahasa Indonesia (Indonesia)", flag: "🇮🇩" },
  it: { name: "Italiano", flag: "🇮🇹" },
  "it-IT": { name: "Italiano (Italia)", flag: "🇮🇹" },
  ja: { name: "日本語", flag: "🇯🇵" },
  "ja-JP": { name: "日本語 (日本)", flag: "🇯🇵" },
  ko: { name: "한국어", flag: "🇰🇷" },
  "ko-KR": { name: "한국어 (대한민국)", flag: "🇰🇷" },
  ms: { name: "Bahasa Melayu", flag: "🇲🇾" },
  "ms-MY": { name: "Bahasa Melayu (Malaysia)", flag: "🇲🇾" },
  nb: { name: "Norsk bokmål", flag: "🇳🇴" },
  "nb-NO": { name: "Norsk bokmål (Norge)", flag: "🇳🇴" },
  nl: { name: "Nederlands", flag: "🇳🇱" },
  "nl-BE": { name: "Nederlands (België)", flag: "🇧🇪" },
  "nl-NL": { name: "Nederlands (Nederland)", flag: "🇳🇱" },
  pl: { name: "Polski", flag: "🇵🇱" },
  "pl-PL": { name: "Polski (Polska)", flag: "🇵🇱" },
  pt: { name: "Português", flag: "🇵🇹" },
  "pt-BR": { name: "Português (Brasil)", flag: "🇧🇷" },
  "pt-PT": { name: "Português (Portugal)", flag: "🇵🇹" },
  ru: { name: "Русский", flag: "🇷🇺" },
  "ru-RU": { name: "Русский (Россия)", flag: "🇷🇺" },
  sk: { name: "Slovenčina", flag: "🇸🇰" },
  "sk-SK": { name: "Slovenčina (Slovensko)", flag: "🇸🇰" },
  sv: { name: "Svenska", flag: "🇸🇪" },
  "sv-SE": { name: "Svenska (Sverige)", flag: "🇸🇪" },
  th: { name: "ไทย", flag: "🇹🇭" },
  "th-TH": { name: "ไทย (ไทย)", flag: "🇹🇭" },
  tr: { name: "Türkçe", flag: "🇹🇷" },
  "tr-TR": { name: "Türkçe (Türkiye)", flag: "🇹🇷" },
  uk: { name: "Українська", flag: "🇺🇦" },
  "uk-UA": { name: "Українська (Україна)", flag: "🇺🇦" },
  zh: { name: "中文", flag: "🇨🇳" },
  "zh-CN": { name: "中文 (简体)", flag: "🇨🇳" },
  "zh-HK": { name: "中文 (香港)", flag: "🇭🇰" },
  "zh-TW": { name: "中文 (繁體)", flag: "🇹🇼" },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: false,
    interpolation: { escapeValue: false },
    resources: {
      ar: { translation: arTranslation },
      'ar-SA': { translation: arSATranslation },
      bg: { translation: bgTranslation },
      'bg-BG': { translation: bgBGTranslation },
      ca: { translation: caTranslation },
      'ca-ES': { translation: caESTranslation },
      cs: { translation: csTranslation },
      'cs-CZ': { translation: csCZTranslation },
      da: { translation: daTranslation },
      'da-DK': { translation: daDKTranslation },
      de: { translation: deTranslation },
      'de-DE': { translation: deDETranslation },
      el: { translation: elTranslation },
      'el-GR': { translation: elGRTranslation },
      en: { translation: enTranslation },
      'en-AU': { translation: enAUTranslation },
      'en-CA': { translation: enCATranslation },
      'en-GB': { translation: enGBTranslation },
      'en-IE': { translation: enIETranslation },
      'en-US': { translation: enUSTranslation },
      es: { translation: esTranslation },
      'es-419': { translation: es419Translation },
      'es-AR': { translation: esARTranslation },
      'es-ES': { translation: esESTranslation },
      'es-MX': { translation: esMXTranslation },
      fi: { translation: fiTranslation },
      'fi-FI': { translation: fiFITranslation },
      fr: { translation: frTranslation },
      'fr-CA': { translation: frCATranslation },
      'fr-FR': { translation: frFRTranslation },
      he: { translation: heTranslation },
      'he-IL': { translation: heILTranslation },
      hr: { translation: hrTranslation },
      'hr-HR': { translation: hrHRTranslation },
      hu: { translation: huTranslation },
      'hu-HU': { translation: huHUTranslation },
      id: { translation: idTranslation },
      'id-ID': { translation: idIDTranslation },
      it: { translation: itTranslation },
      'it-IT': { translation: itITTranslation },
      ja: { translation: jaTranslation },
      'ja-JP': { translation: jaJPTranslation },
      ko: { translation: koTranslation },
      'ko-KR': { translation: koKRTranslation },
      ms: { translation: msTranslation },
      'ms-MY': { translation: msMYTranslation },
      nb: { translation: nbTranslation },
      'nb-NO': { translation: nbNOTranslation },
      nl: { translation: nlTranslation },
      'nl-BE': { translation: nlBETranslation },
      'nl-NL': { translation: nlNLTranslation },
      pl: { translation: plTranslation },
      'pl-PL': { translation: plPLTranslation },
      pt: { translation: ptTranslation },
      'pt-BR': { translation: ptBRTranslation },
      'pt-PT': { translation: ptPTTranslation },
      ru: { translation: ruTranslation },
      'ru-RU': { translation: ruRUTranslation },
      sk: { translation: skTranslation },
      'sk-SK': { translation: skSKTranslation },
      sv: { translation: svTranslation },
      'sv-SE': { translation: svSETranslation },
      th: { translation: thTranslation },
      'th-TH': { translation: thTHTranslation },
      tr: { translation: trTranslation },
      'tr-TR': { translation: trTRTranslation },
      uk: { translation: ukTranslation },
      'uk-UA': { translation: ukUATranslation },
      zh: { translation: zhTranslation },
      'zh-CN': { translation: zhCNTranslation },
      'zh-HK': { translation: zhHKTranslation },
      'zh-TW': { translation: zhTWTranslation },
    }
  });

export default i18n;
