import { FC, SVGAttributes } from "react";
import { CurrencyISO } from "@brandserver-client/types";
import {
  CoinEURIcon,
  CoinKRIcon,
  CoinUSDIcon,
  CoinGBPIcon,
  CoinINRIcon,
  CoinBRLIcon,
  CoinPENIcon
} from "@brandserver-client/icons";

const CoinIcons: { [key: string]: FC<SVGAttributes<SVGSVGElement>> } = {
  EUR: CoinEURIcon,
  SEK: CoinKRIcon,
  NOK: CoinKRIcon,
  CAD: CoinUSDIcon,
  USD: CoinUSDIcon,
  GBP: CoinGBPIcon,
  INR: CoinINRIcon,
  BRL: CoinBRLIcon,
  CLP: CoinUSDIcon,
  PEN: CoinPENIcon
};

const getCoinIcon = (currencyISO: CurrencyISO) => {
  return CoinIcons[currencyISO] || CoinIcons["INR"];
};

export { getCoinIcon };
