import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

export function useLang() {
  const { i18n } = useTranslation();
  
  const setLang = useCallback((lang: string) => {
    localStorage.setItem('lang', lang);
    i18n.changeLanguage(lang);
  }, [i18n]);

  return { lang: i18n.language, setLang, t: i18n.t };
}
