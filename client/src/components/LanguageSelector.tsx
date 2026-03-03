import { useState, useRef, useEffect } from "react";
import { useI18n, SUPPORTED_LOCALES } from "../i18n";
import type { Locale } from "../i18n";
import "./LanguageSelector.css";

export function LanguageSelector() {
  const { locale, setLocale } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = SUPPORTED_LOCALES.find((l) => l.code === locale)!;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="lang-selector" ref={ref}>
      <button
        className="lang-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select language"
      >
        <span className="lang-flag">{current.flag}</span>
        <span className="lang-code">{current.code.toUpperCase()}</span>
      </button>
      {isOpen && (
        <div className="lang-dropdown">
          {SUPPORTED_LOCALES.map((l) => (
            <button
              key={l.code}
              className={`lang-option ${l.code === locale ? "lang-option--active" : ""}`}
              onClick={() => { setLocale(l.code as Locale); setIsOpen(false); }}
            >
              <span className="lang-flag">{l.flag}</span>
              <span className="lang-label">{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
