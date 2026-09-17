import React, { createContext, useContext, useEffect, useState } from 'react';
import { activateLanguage, Language, LANGUAGES, LOCALES, t } from './core';

function readLanguage(): Language {
  try {
    const saved = localStorage.getItem('splitmate_language');
    return LANGUAGES.includes(saved as Language) ? saved as Language : 'vi';
  } catch { return 'vi'; }
}
const initialLanguage = readLanguage();
activateLanguage(initialLanguage);
const I18nContext = createContext({ language: initialLanguage, locale: LOCALES[initialLanguage], setLanguage: (_language: Language) => {}, t });
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setState] = useState<Language>(initialLanguage);
  const setLanguage = (next: Language) => {
    if (!LANGUAGES.includes(next)) return;
    activateLanguage(next);
    setState(next);
    try { localStorage.setItem('splitmate_language', next); } catch { /* Browser storage may be disabled. */ }
  };
  useEffect(() => { document.documentElement.lang = language; document.title = t('pageTitle'); }, [language]);
  return <I18nContext.Provider value={{ language, locale: LOCALES[language], setLanguage, t }}>{children}</I18nContext.Provider>;
}
export function useI18n() { return useContext(I18nContext); }
