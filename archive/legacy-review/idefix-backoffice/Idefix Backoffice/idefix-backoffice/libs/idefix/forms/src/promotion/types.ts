export type PromotionFormValues = {
  name: string;
  multiplier: string | number;
  autoStart: boolean;
  allGames: boolean;
  calculateRounds: boolean;
  calculateWins: boolean;
  calculateWinsRatio: boolean;
  minimumContribution: string | number;
  games: number[];
  active: boolean;
};
