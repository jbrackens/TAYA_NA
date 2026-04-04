// @flow
import type { CreateEventDraft } from '../../../types/common';

const createEvent = async (
  knex: Knex,
  {
    text,
    campaignId,
    contentId,
    campaignContentId,
    playerId,
    externalPlayerId,
    extras,
  }: CreateEventDraft,
): Promise<Id> => {
  const [{ id: eventId }] = await knex('events')
    .insert({
      text,
      timestamp: new Date(),
      campaignContentId:
        campaignContentId ||
        (campaignId && contentId
          ? knex('campaigns_content')
              .select('id')
              .where({ campaignId, contentId, removedAt: null })
              .first()
          : null),
      campaignId,
      playerId:
        playerId ||
        (externalPlayerId
          ? knex('players').select('id').where({ externalId: externalPlayerId }).first()
          : null),
      extras: JSON.stringify(extras),
    })
    .returning('id');

  return eventId;
};

module.exports = {
  createEvent,
};
