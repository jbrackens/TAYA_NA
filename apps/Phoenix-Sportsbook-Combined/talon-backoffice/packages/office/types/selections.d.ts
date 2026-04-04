import { Id } from "@phoenix-ui/utils";
import { Overwrite } from "utility-types";

export type TalonSelectionOdd = SelectionOdd;

export type TalonSelectionOddAlign = Overwrite<
  TalonSelectionOdd,
  {
    odds?: number;
  }
> & {
  points?: number;
  percent?: number;
};

export type TalonBatchSelectionOddAlign = Overwrite<
  TalonSelectionOddAlign,
  {
    selectionId: Id[];
  }
>;
