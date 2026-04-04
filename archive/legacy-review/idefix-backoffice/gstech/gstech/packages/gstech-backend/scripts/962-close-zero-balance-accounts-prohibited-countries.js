// @flow

const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');

const prohibitedCountries = [
  'AF',
  'AL',
  'DZ',
  'AS',
  'AU',
  'AT',
  'BS',
  'BH',
  'BD',
  'BB',
  'BY',
  'BE',
  'BA',
  'IO',
  'BG',
  'BF',
  'KH',
  'KY',
  'CN',
  'CM',
  'HR',
  'CU',
  'CY',
  'CZ',
  'CD',
  'DK',
  'EG',
  'ER',
  'EE',
  'FJ',
  'FR',
  'GE',
  'DE',
  'GI',
  'GR',
  'GP',
  'GU',
  'GW',
  'GY',
  'HT',
  'HK',
  'HU',
  'IN',
  'IR',
  'IQ',
  'IE',
  'IL',
  'IT',
  'CI',
  'JM',
  'JE',
  'JO',
  'KZ',
  'KE',
  'KW',
  'KG',
  'LA',
  'LV',
  'LB',
  'LR',
  'LY',
  'LT',
  'MO',
  'ML',
  'MQ',
  'MA',
  'MZ',
  'MM',
  'NL',
  'NI',
  'NG',
  'KP',
  'MP',
  'PK',
  'PS',
  'PA',
  'PG',
  'PH',
  'PL',
  'PT',
  'PR',
  'QA',
  'CG',
  'RE',
  'RO',
  'RU',
  'RW',
  'WS',
  'SA',
  'SN',
  'SG',
  'SK',
  'SI',
  'SO',
  'ZA',
  'KR',
  'SS',
  'ES',
  'LK',
  'SD',
  'SE',
  'CH',
  'SY',
  'TZ',
  'TR',
  'UM',
  'UG',
  'UA',
  'AE',
  'GB',
  'US',
  'VI',
  'VU',
  'VA',
  'VE',
  'VN',
  'YE',
  'ZW',
];

const userId = 1339; // Ambrose Muscat

const closeAccountsForbiddenCountries = async () => {
  logger.info('+++ 962 closeAccountsForbiddenCountries START');
  try {
    const updatedPlayers = await pg('players')
      .select('id', 'username')
      .whereIn('countryId', prohibitedCountries) // Add all country IDs here
      .where({
        accountClosed: false,
        accountSuspended: false,
        testPlayer: false,
        balance: 0,
      });
    logger.info(`+++ 962 Found ${updatedPlayers.length} players to update`);

    if (!updatedPlayers.length) {
      logger.info(`+++ 962 No players to update, exiting process`);
      return;
    }

    for (const [index, player] of updatedPlayers.entries()) {
      await pg.transaction(async (trx) => {
        try {
          const { id, username } = player;
          await trx('players')
            .update({
              allowGameplay: false,
              allowTransactions: false,
              accountClosed: true,
              accountSuspended: true,
            })
            .where({ id });
          await trx('player_events').insert({
            playerId: id,
            type: 'account',
            key: 'accountClosed.true',
            details: '{"reasons": [], "accountClosed": true}',
            userId,
          });
          await trx('player_events').insert({
            playerId: id,
            type: 'note',
            content:
              "This account was automatically closed by job (IDXD-962) in accordance with the Compliance team's directive. The player is from a country where our services are not currently available.",
            userId,
          });
          logger.info(`[${index + 1}/${updatedPlayers.length}] Updated player ${id} ${username}`);
          await trx.commit();
        } catch (error) {
          logger.error(error);
          await trx.rollback();
          throw error;
        }
      });
    }
    logger.info(`+++ 962 Updated ${updatedPlayers.length} players`);
  } catch (error) {
    logger.error(error);
    throw error;
  }

  logger.info('+++ 962 closeAccountsForbiddenCountries END');
};

(async (): Promise<any> => {
  await closeAccountsForbiddenCountries();
})()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
