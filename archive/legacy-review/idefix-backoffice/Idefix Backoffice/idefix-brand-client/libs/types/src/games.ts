import { CategoryTags } from "./constants";

export interface GamesCategory {
  name: string;
  tag: CategoryTags;
  game?: string;
  path?: string;
}

export interface Game {
  id: string;
  keywords: string;
  thumbnail: string;
  name: string;
  manufacturer: string;
  link: string;
  viewMode: string;
  searchOnly: boolean;
  tags: string[];
  jackpotValue: string;
  hash?: string;
  options?: [
    {
      id: string;
      name: string;
      stake: string;
      value: string;
      link: string;
    }
  ];
}

export interface StartGameOptions {
  MaltaJurisdiction: boolean;
  GameURL: string;
  GameHTML: string;
  Options: string[];
  mobile: boolean;
  usingbonusmoney: boolean;
  ok?: boolean;
  result?: string;
  ForceFullscreen?: boolean;
}
