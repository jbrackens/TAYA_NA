import { FC, SVGAttributes } from "react";
import { CurrencyISO } from "@brandserver-client/types";
import {
  DepositEURIcon,
  DepositKRIcon,
  DepositUSDIcon,
  DepositGBPIcon,
  DepositINRIcon,
  DepositBRLIcon,
  DepositPENIcon
} from "@brandserver-client/icons";

const DepositIcons: { [key: string]: FC<SVGAttributes<SVGSVGElement>> } = {
  EUR: DepositEURIcon,
  SEK: DepositKRIcon,
  NOK: DepositKRIcon,
  CAD: DepositUSDIcon,
  USD: DepositUSDIcon,
  GBP: DepositGBPIcon,
  INR: DepositINRIcon,
  BRL: DepositBRLIcon,
  CLP: DepositUSDIcon,
  PEN: DepositPENIcon
};

const getDepositIcon = (
  currencyISO: CurrencyISO
): FC<SVGAttributes<SVGSVGElement>> => {
  return DepositIcons[currencyISO] || DepositIcons["EUR"];
};

export { getDepositIcon };
