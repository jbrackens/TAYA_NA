/* @flow */
const _ = require('lodash');
const pg = require('gstech-core/modules/pg');

export type RiskType = 'customer' | 'transaction' | 'interface' | 'geo';
export type RequiredRole = 'administrator' | 'riskManager' | 'payments' | 'agent';

export type RiskTypeDefinition = {
  type: RiskType,
  title: string,
  maxPoints: number,
  share: number,
};

export type RiskDraftDefinition = {
  type: RiskType,
  fraudKey: string,
  points: number,
  maxCumulativePoints: number,
  requiredRole: RequiredRole,
  active: boolean,
  name: string,
  title: string,
  description: string,
  manualTrigger: boolean,
};
export type RiskDefinition = { id: Id, ...RiskDraftDefinition };
export type RiskUpdateDefinition = Partial<RiskDraftDefinition>;

const riskLevelMap = {
  low: 10,
  medium: 50,
  high: 90,
}

const getRiskTypes = (): Promise<RiskTypeDefinition[]> =>
  pg('risk_types').select('*');

const getTransactionRisk = async (playerId: Id) => {
  const { rows: transactionRows } = await pg.raw(`
  select
    game_profiles.name,
    game_profiles."riskProfile",
    sum(report_daily_player_game_summary.count)::int as count,
    max(day) as "latestOccurrence"
  from players
  left join report_daily_player_game_summary on report_daily_player_game_summary."playerId"=players.id
  left join brand_game_profiles on players."brandId"=brand_game_profiles."brandId" and brand_game_profiles."gameId"=report_daily_player_game_summary."gameId"
  left join game_profiles on brand_game_profiles."gameProfileId"=game_profiles.id
  where players.id=:playerId and report_daily_player_game_summary.type='bet'
  group by game_profiles."riskProfile", game_profiles.name
  order by count desc
  `, {
    playerId
  });
  return transactionRows;
}

const getTransactionRiskLevel = async (playerId: Id) => {
  const transactionRows = await getTransactionRisk(playerId);
  const total = Math.max(1, _.sumBy(transactionRows, 'count'));
  const transactionRisk = Math.round(transactionRows.reduce((prev, curr) =>
    prev + (riskLevelMap[curr.riskProfile] * curr.count)
    , 0) / total) || 0;
  return transactionRisk;
};

const getGeoRiskLevel = async (playerId: Id) => {
  const { riskProfile, countryId, createdAt } = await pg('players')
    .first('countries.riskProfile', 'countryId', 'createdAt')
    .innerJoin('countries', (qb) =>
      qb.on('countries.id', 'players.countryId').on('countries.brandId', 'players.brandId'),
    )
    .where({ 'players.id': playerId });
  return {
    contribution: riskLevelMap[riskProfile],
    riskProfile,
    countryId,
    createdAt,
  };
};

const getRiskLevel = async (playerId: Id): Promise<{[type: RiskType]: number, total: number}> => {
  const { rows } = await pg.raw(`
    select
      coalesce(sum(r.points), 0) as points,
      risk_types.type,
      risk_types.share,
      risk_types."maxPoints"
    from risk_types
    left join risks on risks.type=risk_types.type
    left join
    (
      SELECT
        risks."fraudKey",
        least(count(*) * sum(player_frauds."points")::int, min("maxCumulativePoints")) AS points
      FROM player_frauds
      JOIN risks ON risks."fraudKey"=player_frauds."fraudKey"
      WHERE "playerId"=:playerId and risks.active=true and cleared=false and checked=true
      GROUP BY risks."fraudKey"
    ) r on r."fraudKey"=risks."fraudKey"
    group by risk_types.type
  `, {
    playerId
  });

  const result: { [type: RiskType]: number, total: number } = { total: 0 };
  rows.forEach(({ type, points }) => {
    result[type] = points;
  });
  result.transaction += await getTransactionRiskLevel(playerId);
  result.geo += (await getGeoRiskLevel(playerId)).contribution;

  result.total = Math.round(
    rows.reduce((a, b) => {
      const value = result[b.type];
      const l = Math.round(b.share * Math.min(b.maxPoints, value / b.maxPoints));
      return a + l;
    }, 0)
  );
  return result;
};


const getRiskStatusTransaction = async (playerId: Id) => {
  const gameProfiles = await getTransactionRisk(playerId);
  const total = Math.max(1, _.sumBy(gameProfiles, 'count'));
  const ret = gameProfiles.map(({ name, riskProfile, count, latestOccurrence }) => ({
    fraudKey: 'game_risk_profile',
    name: `Game profile "${name}" with risk profile: ${riskProfile}`,
    count,
    contribution: Math.round((riskLevelMap[riskProfile] / 100) * (100 * count / total)),
    latestOccurrence,
  }));
  return ret;
};

const getRiskStatusGeo = async (playerId: Id) => {
  const { contribution, countryId, riskProfile, createdAt } = await getGeoRiskLevel(playerId);
  return {
    fraudKey: 'country_risk_profile',
    name: `Country ${countryId} risk profile: ${riskProfile}`,
    count: 1,
    contribution,
    latestOccurrence: createdAt,
  }
};

const getRiskStatus = async (playerId: Id, riskType: RiskType): Promise<any> => {
  const { rows } = await pg.raw(`
    SELECT
      risks."fraudKey",
      risks.name,
      count(*) as count,
      100 * least(min(risks."maxCumulativePoints"), sum(player_frauds.points)) / min(risk_types."maxPoints") as contribution,
      max("createdAt") AS "latestOccurrence"
    FROM player_frauds
    JOIN risks ON risks."fraudKey"=player_frauds."fraudKey"
    JOIN risk_types on risks.type=risk_types.type
    WHERE "playerId"=? and risks.type=? and risks.active=true and cleared=false and checked=true
    GROUP BY risks."fraudKey", risks.name
    ORDER BY "latestOccurrence" desc`, [playerId, riskType]);
  let extra = [];
  if (riskType === 'geo') {
    extra.push(await getRiskStatusGeo(playerId));
  }
  if (riskType === 'transaction') {
    extra = await getRiskStatusTransaction(playerId);
  }
  return [...extra, ...rows];
};

const getRiskLog = async (playerId: Id, riskType: RiskType): Promise<any> => {
  const { rows } = await pg.raw(`
    SELECT
      player_frauds.id,
      player_frauds."createdAt",
      risks."fraudKey",
      risks.name,
      player_frauds.points,
      users.handle
    FROM player_frauds
    LEFT OUTER JOIN users on users.id = player_frauds."checkedBy"
    JOIN risks ON risks."fraudKey"=player_frauds."fraudKey"
    JOIN risk_types on risks.type=risk_types.type
    WHERE "playerId"=? and risks.type=? and risks.active=true and cleared=false and checked=true
    ORDER BY "createdAt" desc`, [playerId, riskType]);
  return rows;
};

const getRisks = (filter?: { manualTrigger?: boolean }): Promise<RiskDefinition[]> => pg('risks')
  .select('*')
  .modify(qb => filter && filter.manualTrigger && qb.where({ manualTrigger: filter.manualTrigger }))
  .orderBy('name');

const createRisk = async (riskDraft: RiskUpdateDefinition): Promise<RiskDefinition> => {
  const [risk] = await pg('risks').insert(riskDraft).returning('*');
  return risk;
};

const updateRisk = async (riskId: Id, riskDraft: RiskUpdateDefinition): Promise<RiskDefinition> => {
  const [updated] = await pg('risks').where({ id: riskId }).update(riskDraft).returning('*');
  return updated;
};

module.exports = {
  getRiskLevel,
  getRiskStatus,
  getRiskLog,
  getRiskTypes,
  getRisks,
  createRisk,
  updateRisk,
};
