import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import jaTranslation from './locales/ja.json';
import enTranslation from './locales/en.json';
import frTranslation from './locales/fr.json';
import deTranslation from './locales/de.json';
import zhTranslation from './locales/zh.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ja: {
        translation: jaTranslation,
      },
      en: {
        translation: enTranslation,
      },
      fr: {
        translation: frTranslation,
      },
      de: {
        translation: deTranslation,
      },
      zh: {
        translation: zhTranslation,
      },
    },
    lng: 'ja', // デフォルト言語を日本語に設定
    fallbackLng: 'ja',
    interpolation: {
      escapeValue: false, // React内では既にXSS対策されているため
    },
  });

export default i18n;
