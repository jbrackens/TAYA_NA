import { RiskProfile } from "./risk";

export interface GameProfileSetting {
  brandId: string;
  brandName: string;
  gameProfileId: string;
  availableProfiles: GameProfile[];
}

export interface GameManufacturer {
  id: string;
  name: string;
  parentId: string;
  license: string;
  active: boolean;
}

export interface GameProfile {
  name: string;
  brandId: string;
  wageringMultiplier: number;
  riskProfile: RiskProfile;
  id: number;
}

export interface GameRound {
  id: number;
  timestamp: string;
  manufacturerSessionId: number;
  manufacturerId: string;
  externalGameRoundId: string;
  gameId: number;
  closed: boolean;
}

export interface GamesSummary {
  name: string;
  manufacturer: string;
  betCount: number;
  type: string;
  realBets: string;
  bonusBets: string;
  realWins: string;
  bonusWins: string;
  averageBet: string;
  biggestWin: string;
}
