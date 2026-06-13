export enum DisplayOddsEnum {
  AMERICAN = "american",
  DECIMAL = "decimal",
  FRACTIONAL = "fractional",
}

export type DisplayOdds = {
  [DisplayOddsEnum.AMERICAN]: string;
  [DisplayOddsEnum.DECIMAL]: number;
  [DisplayOddsEnum.FRACTIONAL]: string;
} | null;

export type SelectionOdd = {
  odds: number;
  displayOdds: DisplayOdds;
  selectionId: string;
  selectionName: string;
  isStatic?: boolean;
  active?: boolean;
};
