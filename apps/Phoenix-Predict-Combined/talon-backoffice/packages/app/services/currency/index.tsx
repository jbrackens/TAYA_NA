import { useCurrencyHook } from "@phoenix-ui/utils";
import { useSelector } from "react-redux";
import { selectCurrency } from "../../lib/slices/siteSettingsSlice";

export const useCurrency = () => {
  const currency = useSelector(selectCurrency);
  return useCurrencyHook(currency);
};
