import { isString } from "lodash";
import { InputPercentageInputValue } from "../../components/form/input-percentage/index";

export const alignByPercent = (
  odds: number,
  perc: number | InputPercentageInputValue,
) =>
  odds + ((isString(perc) ? parseFloat(perc) : (perc as number)) / 100) * odds;

export const alignByPoints = (odds: number, points: number) => odds + points;
