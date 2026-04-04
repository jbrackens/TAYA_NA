/* @flow */
import type { Player } from 'gstech-core/modules/types/player';

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

const personPlayerIdsQuery = (
  knex: Knex,
  playerId: Id | Knex$QueryBuilder<Id>,
): Knex$QueryBuilder<{ playerIds: Id }[]> =>
  knex('players')
    .distinct({ playerIds: 'id' })
    .where({ personId: knex('players').select('personId').where({ id: playerId }) })
    .orWhere({ id: playerId });

const connectPlayersWithPerson = async (knex: Knex, playerId: Id, otherPlayerId: Id) => {
  if (playerId === otherPlayerId) throw new Error(`GOT SAME PLAYER IDS: ${playerId}`);

  const player = await knex('players').where({ id: playerId }).first().forUpdate();
  if (!player) throw new Error(`PLAYER NOT FOUND: ${playerId}`);
  const { personId } = player;

  const otherPlayer = await knex('players').where({ id: otherPlayerId }).first();
  if (!otherPlayer) throw new Error(`PLAYER NOT FOUND: ${otherPlayerId}`);
  const { personId: otherPersonId } = otherPlayer;

  if (personId && otherPersonId && personId !== otherPersonId)
    throw new Error(`DIFFERENT PERSONS EXIST: ${playerId}, ${otherPlayerId}`);

  const newPersonId =
    personId || otherPersonId || (await knex('persons').insert({}).returning('id'))[0].id;

  await knex('players').whereIn('id', [playerId, otherPlayerId]).update({ personId: newPersonId });
};

const getPersonDDRequirementFlag = async (knex: Knex, playerId: Id): Promise<Date> => {
  const { paymentTs } = await knex
    .with('person', personPlayerIdsQuery(knex, playerId))
    .with('running_sum', (qb) =>
      qb
        .select({
          runId: knex.raw(`COALESCE(p."personId", py."playerId")`),
          personId: 'p.personId',
          paymentTs: 'py.timestamp',
          paymentId: 'py.id',
          paymentAmount: 'py.amount',
          runTotal: knex.raw(`
              CASE
                when p."personId" is not null
                then SUM(py."amount" / mc."conversionRate") OVER ( PARTITION BY p."personId" ORDER BY py."timestamp")
                else SUM(py."amount" / mc."conversionRate") OVER ( PARTITION BY p."id" ORDER BY py."timestamp")
              END
          `),
        })
        .from({ py: 'payments' })
        .leftJoin({ p: 'players' }, 'p.id', 'py.playerId')
        .join(
          { mc: 'monthly_conversion_rates' },
          {
            'p.currencyId': 'mc.currencyId',
            'mc.month': knex.raw(`date_trunc('month', py."timestamp")`),
          },
        )
        .where({ 'py.paymentType': 'deposit' })
        .where((qb) =>
          qb
            .where({ 'py.status': 'complete' })
            .orWhere((qb) =>
              qb
                .where({ 'py.status': 'pending' })
                .whereRaw(`py."timestamp" > now() - interval '180 days'`),
            ),
        )
        .whereIn('py.playerId', knex.select('playerIds').from('person')),
    )
    .with('dd_threshold', (qb) =>
      qb
        .select('*')
        .distinctOn('runId')
        .from('running_sum')
        .where('runTotal', '>=', 200000)
        .orderBy(['runId', 'paymentTs']),
    )
    .first('paymentTs')
    .from('dd_threshold');
  return paymentTs;
};

const disconnectPlayerFromPerson = async (knex: Knex, playerId: Id): Promise<void> =>
  knex('players').where({ id: playerId }).update({ personId: null });

const getConnectedPlayers = async (knex: Knex, playerId: Id): Promise<Player[]> =>
  knex('players')
    .select('id', 'email', 'firstName', 'lastName', 'brandId', 'currencyId', 'riskProfile')
    .with('p', knex.from('players').select('personId').where({ id: playerId }).first())
    .where({ personId: knex.select('personId').from('p').first() })
    .whereNot({ id: playerId });

const connectPlayersWithSamePhoneAndEmail = async (playerId: Id): Promise<void> => {
  logger.debug(`+++ connectPlayersWithSamePhoneAndEmail playerId ${playerId}`);
  await pg.transaction(async (tx) => {
    const player = await tx('players').where({ id: playerId }).first();
    if (!player) return;

    const samePlayers = await tx('players')
      .select('id', 'mobilePhone', 'email', 'personId')
      .where({ mobilePhone: player.mobilePhone, email: player.email })
      .whereNot({ id: playerId });
    if (!samePlayers || samePlayers.length === 0) return;

    const playersIds = [playerId, ...samePlayers.map((playerItem) => playerItem.id)];
    const findPlayerWithPerson = await tx('players')
      .first()
      .whereIn('id', playersIds)
      .whereNotNull('personId');
    if (findPlayerWithPerson) {
      const { personId } = findPlayerWithPerson;
      await tx('players').whereIn('id', playersIds).update({ personId });
      logger.debug(`++++ connectPlayersWithSamePhoneAndEmail personId exists`, {
        personId,
        playersIds,
      });
      return;
    }
    const [{ id: personId }] = await tx('persons').insert({}).returning('id');
    await tx('players').whereIn('id', playersIds).update({ personId });
    logger.debug(`++++ connectPlayersWithSamePhoneAndEmail new personId`, {
      personId,
      playersIds,
    });
  });
};

module.exports = {
  connectPlayersWithPerson,
  connectPlayersWithSamePhoneAndEmail,
  disconnectPlayerFromPerson,
  getConnectedPlayers,
  personPlayerIdsQuery,
  getPersonDDRequirementFlag,
};
