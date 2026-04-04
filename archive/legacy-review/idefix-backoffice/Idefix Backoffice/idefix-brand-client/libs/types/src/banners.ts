import { FreeSpin, AvailableBonus } from "./bonuses";

export interface Banners {
  game?: Banner;
  deposit?: Banner;
  frontpage?: Banner;
  nonloggedin?: Banner;
  "myaccount-rewards"?: Banner;
  "myaccount-shop"?: Banner;
  "myjefe-wheel"?: Banner;
  "myjefe-bounty"?: Banner;
  "game-bounty"?: Banner;
  "game-level"?: Banner;
  "game-wheel"?: Banner;
  "game-leaderboard"?: Banner;
  "myjefe-level"?: Banner;
}

export interface BannerOptions {
  show?: boolean;
  content?: string;
  subtitle?: string;
  title?: string;
  option1?: {
    image: string;
    selected_image: string;
    bonus: AvailableBonus;
  };
  option2?: {
    image: string;
    selected_image: string;
    bonus: AvailableBonus;
  };
}

export interface Banner {
  active: boolean;
  banner: string;
  bg?: string;
  disclaimer?: string;
  progress?: {
    completed: boolean;
    progress: number;
    coins: number;
    type: string;
  };
  options?: BannerOptions;
  bonus?: {
    image: {
      image: string;
    };
  };
  freespins?: FreeSpin[];
}
