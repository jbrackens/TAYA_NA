import { IntlConfig } from "react-intl";
import en from "date-fns/locale/en-GB";
import no from "date-fns/locale/nb";
import fi from "date-fns/locale/fi";
import de from "date-fns/locale/de";
import sv from "date-fns/locale/sv";

type Locale = "en" | "no" | "fi" | "de" | "sv";

const LOCALES = {
  en,
  no,
  fi,
  de,
  sv
};

export const getFnsLocale = (locale: IntlConfig["locale"]) =>
  LOCALES[locale as Locale];
