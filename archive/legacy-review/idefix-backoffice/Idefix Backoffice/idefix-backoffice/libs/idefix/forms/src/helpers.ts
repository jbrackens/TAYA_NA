import find from "lodash/fp/find";
import { isValidIban } from "./validators";

const bicTable: { [key: string]: { code: string; bic: string }[] } = {
  FI: [
    { code: "1", bic: "NDEAFIHH" },
    { code: "2", bic: "NDEAFIHH" },
    { code: "5", bic: "OKOYFIHH" },
    { code: "31", bic: "HANDFIHH" },
    { code: "33", bic: "ESSEFIHX" },
    { code: "34", bic: "DABAFIHX" },
    { code: "36", bic: "SBANFIHH" },
    { code: "37", bic: "DNBAFIHX" },
    { code: "38", bic: "SWEDFIHH" },
    { code: "39", bic: "SBANFIHH" },
    { code: "405", bic: "HELSFIHH" },
    { code: "497", bic: "HELSFIHH" },
    { code: "47", bic: "POPFFI22" },
    { code: "4", bic: "ITELFIHH" },
    { code: "6", bic: "AABAFI22" },
    { code: "713", bic: "CITIFIHX" },
    { code: "715", bic: "ITELFIHH" },
    { code: "8", bic: "DABAFIHH" },
  ],
};

export const convertIBANToBIC = (iban: string) => {
  if (isValidIban(iban)) {
    const newIban = iban.replace(/\s/, "");
    const country = bicTable[newIban.substring(0, 2)];

    if (country) {
      const start = newIban.substring(4);
      const result = find(x => start.indexOf(x.code) === 0, country);
      if (result) {
        return result.bic;
      }
    }
  }
  return "";
};
