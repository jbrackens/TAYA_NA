export type GameFormValues = {
  gameId: string;
  name: string;
  manufacturerId: string;
  manufacturerGameId: string;
  mobileGame: boolean;
  playForFun: boolean;
  rtp: string | number;
  permalink: string;
  archived: boolean;
  profiles: number[] | null;
};
