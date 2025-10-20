import { createI18n } from "vue-i18n";

// Define all available languages with their display names and flags
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

// Function to dynamically import translation files
async function loadTranslation(locale) {
  try {
    const translation = await import(
      `./translation/${locale}/translations.json`
    );
    return translation.default || translation;
  } catch (error) {
    console.warn(`Translation file for ${locale} not found, using fallback`);

    // Try base language (e.g., 'en' for 'en-US')
    const baseLang = locale.split("-")[0];
    if (baseLang !== locale) {
      try {
        const baseTranslation = await import(
          `./translation/${baseLang}/translations.json`
        );
        return baseTranslation.default || baseTranslation;
      } catch (baseError) {
        console.warn(`Base translation file for ${baseLang} not found`);
      }
    }

    // Fallback to English
    try {
      const fallback = await import(`./translation/en/translations.json`);
      return fallback.default || fallback;
    } catch (fallbackError) {
      console.error("No translation files found, using empty object");
      return {};
    }
  }
}

// Load all translations dynamically
async function loadAllTranslations() {
  const messages = {};

  // Load translations for all available languages
  for (const locale of Object.keys(availableLanguages)) {
    messages[locale] = await loadTranslation(locale);
  }

  return messages;
}

// Create i18n instance with dynamic loading
async function createI18nInstance() {
  const messages = await loadAllTranslations();

  return createI18n({
    locale: "it", // default locale
    fallbackLocale: "en",
    legacy: false, // Enable Composition API mode
    globalInjection: true, // Enable global $t
    messages,
  });
}

// Export the i18n instance
let i18nInstance = null;

export default async function getI18n() {
  if (!i18nInstance) {
    i18nInstance = await createI18nInstance();
  }
  return i18nInstance;
}
