import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { en } from "./en";
import { translations, RTL_LANGUAGES } from "./translations";

const resources: Record<string, { translation: unknown }> = {
  en: { translation: en },
};

for (const [code, dict] of Object.entries(translations)) {
  resources[code] = { translation: dict as unknown };
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: ["en", ...Object.keys(translations)],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

const applyDirection = (lng: string) => {
  if (typeof document === "undefined") return;
  const base = lng.split("-")[0];
  document.documentElement.dir = RTL_LANGUAGES.has(base) ? "rtl" : "ltr";
  document.documentElement.lang = base;
};

applyDirection(i18n.language || "en");
i18n.on("languageChanged", applyDirection);

export default i18n;
