export type GoMatchTrackerScore = {
  home: number;
  away: number;
};

export type GoMatchTrackerIncident = {
  incidentId: string;
  fixtureId: string;
  type: string;
  period?: string;
  clockSeconds?: number;
  occurredAt: string;
  score?: GoMatchTrackerScore;
  details?: Record<string, string>;
};

export type GoMatchTrackerResponse = {
  fixtureId: string;
  status: string;
  period?: string;
  clockSeconds?: number;
  score: GoMatchTrackerScore;
  incidents: GoMatchTrackerIncident[];
  updatedAt: string;
};

export type GoFixtureStatMetric = {
  home: number;
  away: number;
  unit?: string;
};

export type GoFixtureStatsResponse = {
  fixtureId: string;
  status: string;
  period?: string;
  clockSeconds?: number;
  metrics: Record<string, GoFixtureStatMetric>;
  updatedAt: string;
};
