import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { translate, type Locale } from './messages';

export type Theme = 'dark' | 'light';

interface PreferencesValue {
  locale: Locale;
  theme: Theme;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: Theme) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
}

const STORAGE_THEME = 'lpa-theme';
const STORAGE_LOCALE = 'lpa-locale';

const PreferencesContext = createContext<PreferencesValue | null>(null);

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const storedTheme = window.localStorage.getItem(STORAGE_THEME);
  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') {
    return 'en';
  }

  const storedLocale = window.localStorage.getItem(STORAGE_LOCALE);
  if (storedLocale === 'en' || storedLocale === 'id') {
    return storedLocale;
  }

  return navigator.language.toLowerCase().startsWith('id') ? 'id' : 'en';
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [locale, setLocale] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_THEME, theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_LOCALE, locale);
    document.documentElement.lang = locale === 'id' ? 'id' : 'en';
  }, [locale]);

  const value = useMemo<PreferencesValue>(
    () => ({
      locale,
      theme,
      setLocale,
      setTheme,
      t: (key, params) => translate(locale, key, params),
      formatDate: (value, options) =>
        new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-US', {
          dateStyle: 'medium',
          ...options,
        }).format(typeof value === 'string' ? new Date(value) : value),
    }),
    [locale, theme],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider.');
  }

  return context;
}
