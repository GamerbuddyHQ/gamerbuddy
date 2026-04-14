import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { type LangCode, type Translations, TRANSLATIONS, LANGUAGES } from "./translations";

const STORAGE_KEY = "gb_lang";

function detectBrowserLang(): LangCode {
  try {
    const nav = navigator.language || "";
    const code = nav.slice(0, 2).toLowerCase();
    const map: Record<string, LangCode> = {
      en: "en", hi: "hi", es: "es", fr: "fr",
      de: "de", pt: "pt", ar: "ar", ja: "ja", ko: "ko", zh: "zh",
    };
    return map[code] ?? "en";
  } catch {
    return "en";
  }
}

function loadLang(): LangCode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as LangCode | null;
    if (stored && TRANSLATIONS[stored]) return stored;
    return detectBrowserLang();
  } catch {
    return "en";
  }
}

type I18nContextType = {
  lang: LangCode;
  t: Translations;
  setLang: (code: LangCode) => void;
  isRtl: boolean;
};

const I18nContext = createContext<I18nContextType>({
  lang: "en",
  t: TRANSLATIONS.en,
  setLang: () => {},
  isRtl: false,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(loadLang);

  const setLang = useCallback((code: LangCode) => {
    setLangState(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch {}
  }, []);

  const langMeta = LANGUAGES.find((l) => l.code === lang);
  const isRtl = langMeta?.dir === "rtl";

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", isRtl ? "rtl" : "ltr");
  }, [lang, isRtl]);

  return (
    <I18nContext.Provider value={{ lang, t: TRANSLATIONS[lang], setLang, isRtl }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export { LANGUAGES, type LangCode };
