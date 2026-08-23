import { useState, useEffect, useCallback, useSyncExternalStore } from "react";

export interface Language {
  code: string;
  name: string;
  native: string;
}

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "or", name: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "as", name: "Assamese", native: "অসমীয়া" },
  { code: "ur", name: "Urdu", native: "اردو" },
  { code: "sa", name: "Sanskrit", native: "संस्कृत" },
  { code: "ne", name: "Nepali", native: "नेपाली" },
  { code: "si", name: "Sinhala", native: "සිංහල" },
  { code: "sd", name: "Sindhi", native: "سنڌي" },
  { code: "kok", name: "Konkani", native: "कोंकणी" },
  { code: "mai", name: "Maithili", native: "मैथिली" },
  { code: "doi", name: "Dogri", native: "डोगरी" },
];

const LANG_KEY = "kisan_lang";

const MENU_ATTR = "data-lang-menu";
const MENU_PROPS = { [MENU_ATTR]: "" } as const;

function injectGoogleTranslate() {
  if (document.getElementById("gt-script")) return;

  const el = document.createElement("div");
  el.id = "google_translate_element";
  el.style.display = "none";
  document.body.appendChild(el);

  (window as unknown as Record<string, unknown>).googleTranslateElementInit =
    () => {
      const GT = (
        window as unknown as Record<
          string,
          {
            translate: {
              TranslateElement: new (o: unknown, id: string) => void;
            };
          }
        >
      ).google;
      new GT.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: LANGUAGES.map((l) => l.code).join(","),
          autoDisplay: false,
          layout: 0,
        },
        "google_translate_element",
      );
    };

  const s = document.createElement("script");
  s.id = "gt-script";
  s.src =
    "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  s.async = true;
  document.head.appendChild(s);
}

function applyLanguage(code: string) {
  if (code === "en") {
    document.cookie =
      "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
    window.location.reload();
    return;
  }
  const val = `/en/${code}`;
  document.cookie = `googtrans=${val}; path=/`;
  document.cookie = `googtrans=${val}; path=/; domain=${window.location.hostname}`;

  const drive = () => {
    const sel = document.querySelector(
      ".goog-te-combo",
    ) as HTMLSelectElement | null;
    if (sel) {
      sel.value = code;
      sel.dispatchEvent(new Event("change"));
      return true;
    }
    return false;
  };
  if (!drive()) {
    let n = 0;
    const t = setInterval(() => {
      if (drive() || n++ > 25) clearInterval(t);
    }, 200);
  }
}

const listeners = new Set<() => void>();
let current: Language =
  LANGUAGES.find((l) => l.code === (localStorage.getItem(LANG_KEY) ?? "en")) ??
  LANGUAGES[0];

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function setCurrent(lang: Language) {
  current = lang;
  localStorage.setItem(LANG_KEY, lang.code);
  listeners.forEach((fn) => fn());
}

export function useLanguage() {
  const selected = useSyncExternalStore(subscribe, () => current);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    injectGoogleTranslate();
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && saved !== "en") setTimeout(() => applyLanguage(saved), 900);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest(`[${MENU_ATTR}]`)) return;
      setOpen(false);
      setSearch("");
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const pick = useCallback((lang: Language) => {
    setOpen(false);
    setSearch("");
    setCurrent(lang);
    applyLanguage(lang.code);
  }, []);

  const toggle = useCallback(() => {
    setOpen((p) => !p);
    setSearch("");
  }, []);

  const needle = search.toLowerCase();
  const filtered = LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(needle) ||
      l.native.toLowerCase().includes(needle),
  );

  return {
    selected,
    open,
    search,
    setSearch,
    menuProps: MENU_PROPS,
    pick,
    toggle,
    filtered,
  };
}
