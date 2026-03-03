import { createContext, useContext } from "react";
import fr from "./locales/fr.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import ptBR from "./locales/pt-BR.json";

// ── Types ────────────────────────────────────────────────────────

export type Locale = "fr" | "en" | "es" | "pt-BR";

export interface LocaleInfo {
  code: Locale;
  label: string;
  flag: string;
}

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: "fr", label: "Fran\u00e7ais", flag: "\u{1F1EB}\u{1F1F7}" },
  { code: "en", label: "English", flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "es", label: "Espa\u00f1ol", flag: "\u{1F1EA}\u{1F1F8}" },
  { code: "pt-BR", label: "Portugu\u00eas (BR)", flag: "\u{1F1E7}\u{1F1F7}" },
];

// ── Translation maps ─────────────────────────────────────────────

type TranslationMap = Record<string, unknown>;

const TRANSLATIONS: Record<Locale, TranslationMap> = {
  fr: fr as TranslationMap,
  en: en as TranslationMap,
  es: es as TranslationMap,
  "pt-BR": ptBR as TranslationMap,
};

// ── Key lookup ───────────────────────────────────────────────────

function getNestedValue(obj: unknown, path: string): string | undefined {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : undefined;
}

/**
 * Translate a key like "arena.title" with optional interpolation.
 * Falls back to English if the key is missing in the current locale.
 */
export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  let value = getNestedValue(TRANSLATIONS[locale], key);

  // Fallback to English
  if (value === undefined && locale !== "en") {
    value = getNestedValue(TRANSLATIONS.en, key);
  }

  // Fallback to key itself
  if (value === undefined) return key;

  // Interpolation: replace {name} with params.name
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }

  return value;
}

// ── Persistence ──────────────────────────────────────────────────

const STORAGE_KEY = "umbra_locale";

export function getStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.some((l) => l.code === stored)) {
      return stored as Locale;
    }
  } catch {
    // localStorage may not be available
  }
  // Default: detect browser language
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith("pt")) return "pt-BR";
  if (browserLang.startsWith("es")) return "es";
  if (browserLang.startsWith("en")) return "en";
  return "fr"; // Default to French
}

export function storeLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // ignore
  }
}

// ── React context ────────────────────────────────────────────────

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const I18nContext = createContext<I18nContextValue>({
  locale: "fr",
  setLocale: () => {},
  t: (key) => key,
});

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
