import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import arTranslation from './ar/ar.json';
import bgTranslation from './bg/bg.json';
import caTranslation from './ca/ca.json';
import csTranslation from './cs/cs.json';
import daTranslation from './da/da.json';
import deTranslation from './de/de.json';
import elTranslation from './el/el.json';
import enTranslation from './en/en.json';
import esTranslation from './es/es.json';
import fiTranslation from './fi/fi.json';
import frTranslation from './fr/fr.json';
import heTranslation from './he/he.json';
import hrTranslation from './hr/hr.json';
import huTranslation from './hu/hu.json';
import idTranslation from './id/id.json';
import itTranslation from './it/it.json';
import jaTranslation from './ja/ja.json';
import koTranslation from './ko/ko.json';
import msTranslation from './ms/ms.json';
import nbTranslation from './nb/nb.json';
import nlTranslation from './nl/nl.json';
import plTranslation from './pl/pl.json';
import ptTranslation from './pt/pt.json';
import ruTranslation from './ru/ru.json';
import skTranslation from './sk/sk.json';
import svTranslation from './sv/sv.json';
import thTranslation from './th/th.json';
import trTranslation from './tr/tr.json';
import ukTranslation from './uk/uk.json';
import zhTranslation from './zh/zh.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: false,
    interpolation: { escapeValue: false },
    resources: {
      ar: { translation: arTranslation },
      bg: { translation: bgTranslation },
      ca: { translation: caTranslation },
      cs: { translation: csTranslation },
      da: { translation: daTranslation },
      de: { translation: deTranslation },
      el: { translation: elTranslation },
      en: { translation: enTranslation },
      es: { translation: esTranslation },
      fi: { translation: fiTranslation },
      fr: { translation: frTranslation },
      he: { translation: heTranslation },
      hr: { translation: hrTranslation },
      hu: { translation: huTranslation },
      id: { translation: idTranslation },
      it: { translation: itTranslation },
      ja: { translation: jaTranslation },
      ko: { translation: koTranslation },
      ms: { translation: msTranslation },
      nb: { translation: nbTranslation },
      nl: { translation: nlTranslation },
      pl: { translation: plTranslation },
      pt: { translation: ptTranslation },
      ru: { translation: ruTranslation },
      sk: { translation: skTranslation },
      sv: { translation: svTranslation },
      th: { translation: thTranslation },
      tr: { translation: trTranslation },
      uk: { translation: ukTranslation },
      zh: { translation: zhTranslation },
    }
  });

export default i18n;
