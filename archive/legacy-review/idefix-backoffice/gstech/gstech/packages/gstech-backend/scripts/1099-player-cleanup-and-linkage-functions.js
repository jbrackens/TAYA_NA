// @flow

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

const { addEvent, addNote } = require('../server/modules/players/PlayerEvent');
const Player = require('../server/modules/players/Player');
const Deposit = require('../server/modules/payments/deposits/Deposit');
const { addPlayerFraud } = require('../server/modules/frauds');

const userId = process.env.NODE_ENV === 'test' ? 1 : 1339; // Ambrose Muscat MLRO

const logInfo = (text: string, args?: any) => {
  if (args) logger.info(`+++ 1099 ${text}`, args);
  else logger.info(`+++ 1099 ${text}`);
};

const logDebug = (text: string, args?: any) => {
  if (args) logger.debug(`+++ 1099 ${text}`, args);
  else logger.debug(`+++ 1099 ${text}`);
};

const logError = (text: string, args?: any) => {
  if (args) logger.error(`XXX 1099 ${text}`, args);
  else logger.error(`XXX 1099 ${text}`);
};

const closeSuspendedAccounts = async (isDryRun: boolean) => {
  logInfo('closeSuspendedAccounts - START', { isDryRun });
  try {
    await pg.transaction(async (tx) => {
      const updates = await tx('players').update({ accountClosed: true }).where({ accountClosed: false, accountSuspended: true });
      if (isDryRun) {
        await tx.rollback();
        logInfo(`closeSuspendedAccounts - END - closed ${updates} accounts. ROLLBACK Successful`);
      } else {
        await tx.commit();
        logInfo(`closeSuspendedAccounts - END - closed ${updates} accounts. COMMIT Successful`);
      }
    });
  } catch (error) {
    logError('closeSuspendedAccounts - ERROR', error);
  }
};

// A1 - Link Accounts (Historical)
const linkAccounts = async (isDryRun: boolean) => {
  logInfo('linkAccounts - START', { isDryRun });
  let list;
  try {
    await pg.transaction(async (tx) => {
      list = await tx.raw(
        `SELECT
        UPPER(players."firstName") || ' ' ||  UPPER(players."lastName") AS "fullName",
        players."dateOfBirth",
        COUNT(*) AS count,
        COUNT("id") filter (where not "accountClosed" and not "accountSuspended") "activeCount",
        array_agg("id") AS "playerIds",
        array_remove(array_agg(DISTINCT "personId"), NULL) AS "personIds"
        FROM
            players
        WHERE
            NOT (UPPER(players."firstName") || ' ' ||  UPPER(players."lastName") = 'ANONYMIZED ANONYMIZED' AND players."dateOfBirth" = '1900-01-01')
            AND NOT "testPlayer"
        GROUP BY
            "fullName",
            players."dateOfBirth"
        HAVING
            COUNT("id") > 1 AND 
            NOT (COUNT("id") filter (where "personId" is NULL) = 0 AND cardinality(array_remove(array_agg(DISTINCT "personId"), NULL)) = 1)
        ORDER BY count DESC;`,
      );
    });
  } catch (error) {
    logError('linkAccounts - ERROR', error);
  }
  if (!list) {
    logError('linkAccounts - The account linkage inital report query failed. Exiting...');
    return;
  }
  const { rows, rowCount } = list;
  if (rowCount === 0) {
    logInfo('linkAccounts - END - No accounts to link');
    return;
  }
  logInfo(`linkAccounts - Found ${rowCount} people with same name and DOB`, rows);
  const batchSize = 100;
  const total = rows.length;
  try {
    await pg.transaction(async (tx) => {
      for (let i = 0; i < total; i += batchSize) {
        const batchRows = rows.slice(i, i + batchSize);
        logInfo(`linkAccounts - Processing batch ${i} to ${i + batchSize}`, batchRows);
        for (const [index, row] of batchRows.entries()) {
          const { fullName, count, dateOfBirth, playerIds, personIds } = row;
          const idx = i + index;
          const progress = `${((idx / total) * 100).toFixed(2)}% ${idx}/${total}`;
          logDebug(`linkAccounts - [${progress}] Processing info for ${fullName} (${dateOfBirth}) with ${count} accounts`, { fullName, count, dateOfBirth, playerIds, personIds });
          let personId;
          let personIdState;
          // Step 0 - Create a person when there is none
          if (personIds.length === 0) {
            logDebug(`linkAccounts - Creating a new person for ${fullName} ${dateOfBirth}`);
            const [{ id }] = await tx('persons').insert({}).returning('id');
            personId = id;
            personIdState = 'NEW';
          } else {
            personId = Math.min(...personIds);
            personIdState = 'EXISTING';
            logDebug(`linkAccounts - Using existing personId ${personId} for ${fullName} ${dateOfBirth}`);
          }
          // Step 1 - Link Players
          const playersLinked = await tx('players').update({ personId }).whereIn('id', playerIds);
          logInfo(`linkAccounts - Linked ${playersLinked} players to ${personIdState} personId ${personId}`, { playerIds });
          for (const playerId of playerIds) {
            const playerIdsString = playerIds.join(', ');
            const note = `Account linkage established via automated job (Ticket IDXD-1099) due to matching First Name + Last Name + DOB. Linked to ${personIdState} personId: ${personId} together with the following player Ids: ${playerIdsString}`;
            await addNote(playerId, userId, note, tx);
            logDebug(`linkAccounts - Added note to player ${playerId}`, { note });
          }
        }
        logDebug(`linkAccounts - [100.00%] Finished linking ${total} people`);
      }
      if (isDryRun) {
        await tx.rollback();
        logInfo(`linkAccounts - ROLLBACK Successful`);
      } else {
        await tx.commit();
        logInfo(`linkAccounts - COMMIT Successful`);
      }
    });
  } catch (error) {
    logError('linkAccounts - failed:', error);
  }
};

// IDXD-1081 - Sync Verification Status
const syncVerificationStatus = async (isDryRun: boolean) => {
  logInfo('syncVerificationStatus - START', { isDryRun });
  let list;
  try {
    await pg.transaction(async (tx) => {
      list = await tx.raw(
        `SELECT
          "personId",
          COUNT(*) AS count,
          COUNT("id") FILTER (WHERE NOT "accountClosed" AND NOT "accountSuspended") "activeCount",
          COUNT("id") FILTER (WHERE "verified") "verifiedAccounts",
          array_agg("id") AS "playerIds"
        FROM
          players
        WHERE
          NOT(UPPER(players. "firstName") || ' ' || UPPER(players. "lastName") = 'ANONYMIZED ANONYMIZED'
            AND players. "dateOfBirth" = '1900-01-01')
          AND "personId" IS NOT NULL
          AND NOT "testPlayer"
        GROUP BY
          "personId"
        HAVING
          COUNT("id") > 1
          AND COUNT("id") FILTER (WHERE "verified") > 0
          AND COUNT("id") FILTER (WHERE "verified") <> COUNT("id")
        ORDER BY
          count DESC;`,
      );
    });
  } catch (error) {
    logError('syncVerificationStatus - ERROR', error);
  }
  if (!list) {
    logError('syncVerificationStatus - The account verification synchronization inital report query failed. Exiting...');
    return;
  }
  const { rows, rowCount } = list;
  if (rowCount === 0) {
    logInfo('syncVerificationStatus - END - No accounts to synchronize verification');
    return;
  }
  logInfo(`syncVerificationStatus - Found ${rowCount} verified personIds with unverified linked accounts`, rows);
  const batchSize = 100;
  const total = rows.length;
  try {
    for (let i = 0; i < total; i += batchSize) {
      const batchRows = rows.slice(i, i + batchSize);
      logInfo(`syncVerificationStatus - Processing batch ${i} to ${i + batchSize}`, batchRows);
      for (const [index, row] of batchRows.entries()) {
        await pg.transaction(async (tx) => {
          const { activeCount, count, personId, playerIds, verifiedAccounts } = row;
          const idx = i + index;
          const progress = `${((idx / total) * 100).toFixed(2)}% ${idx}/${total}`;
          logDebug(`syncVerificationStatus - [${progress}] Processing info for personId ${personId} with ${count} accounts (${activeCount} active, ${verifiedAccounts} verified)`, {
            activeCount,
            count,
            personId,
            playerIds,
            verifiedAccounts,
          });
          const verifiedPlayers = await tx('players').select('*').whereIn('id', playerIds).where('verified', true);
          const unverifiedPlayers = await tx('players').select('*').whereIn('id', playerIds).where('verified', false);
          if (verifiedPlayers.length > 0 && unverifiedPlayers.length > 0) {
            logInfo(`syncVerificationStatus - Found ${verifiedPlayers.length} verified players, and ${unverifiedPlayers.length} unverified players among the linked players`, {
              verifiedPlayers,
            });
            for (const player of unverifiedPlayers) {
              const reason =
                'This account was automatically verified due to a linked account already having verified status under the same player identity (Phone+Email or First Name+Last Name+DOB). Jira ticket: IDXD-1081';  
              if (!isDryRun) await Player.updateAccountStatus(player.id, { verified: true, reason }, userId);
              logDebug(`syncVerificationStatus - Verified player ${player.id}`, { reason });
            }
          }
          if (isDryRun) {
            await tx.rollback();
            logInfo(`syncVerificationStatus - ROLLBACK Successful`);
          } else {
            await tx.commit();
            logInfo(`syncVerificationStatus - COMMIT Successful`);
          }
        });
      }
    }
    logDebug(`syncVerificationStatus - [100.00%] Finished syncing verification status for ${total} personIds`);
  } catch (error) {
    logError('syncVerificationStatus - failed:', error);
  }
};

// A2 - Abuse Accounts
const handleAbuseAccounts = async (isDryRun: boolean) => {
  logInfo('handleAbuseAccounts - START', { isDryRun });
  let list;
  try {
    await pg.transaction(async (tx) => {
      list = await tx.raw(
        `SELECT
        id
        FROM
        players
        WHERE
        "personId" IN (SELECT DISTINCT
            p."personId" FROM players p
            JOIN (
              SELECT
                "brandId", "personId" FROM players
              WHERE
                NOT "accountClosed"
                AND NOT "accountSuspended"
                AND "personId" IS NOT NULL
              GROUP BY
                "brandId", "personId"
              HAVING
                COUNT(*) > 1) dup ON p."personId" = dup."personId"
            WHERE
              NOT "accountClosed"
              AND NOT "accountSuspended"
              AND NOT "testPlayer")
        ORDER BY
        id;`,
      );
    });
  } catch (error) {
    logError('handleAbuseAccounts - ERROR', error);
  }
  if (!list) {
    logError('handleAbuseAccounts - The abuse accounts inital report query failed. Exiting...');
    return;
  }
  const { rows, rowCount } = list;
  if (rowCount === 0) {
    logInfo('handleAbuseAccounts - END - No accounts to deal with');
    return;
  }
  logInfo(`handleAbuseAccounts - Found ${rowCount} abuse accounts`, rows);
  const batchSize = 100;
  const total = rows.length;
  try {
    for (let i = 0; i < total; i += batchSize) {
      const batchRows = rows.slice(i, i + batchSize);
      logInfo(`handleAbuseAccounts - Processing batch ${i} to ${i + batchSize}`, batchRows);
      for (const [index, row] of batchRows.entries()) {
        await pg.transaction(async (tx) => {
          const { id } = row;
          const idx = i + index;
          const progress = `${((idx / total) * 100).toFixed(2)}% ${idx}/${total}`;
          logDebug(`handleAbuseAccounts - [${progress}] Processing info for player.id ${id}`);
          const reason =
            'The account has been closed and suspended via automated job (Ticket IDXD-1099) due to the existence of multiple duplicate accounts created on the same brand, which is in violation of our policy.';  
          if (!isDryRun) await Player.updateAccountStatus(id, { accountClosed: true, accountSuspended: true, reason }, userId);
          logDebug(`handleAbuseAccounts - Closed and suspended player ${id}`, { reason });
          if (isDryRun) {
            await tx.rollback();
            logInfo(`handleAbuseAccounts - [${progress}] ROLLBACK Successful`);
          } else {
            await tx.commit();
            logInfo(`handleAbuseAccounts - [${progress}] COMMIT Successful`);
          }
        });
      }
    }
    logDebug(`handleAbuseAccounts - [100.00%] Finished suspending and closing ${total} personIds abuse people`);
  } catch (error) {
    logError('handleAbuseAccounts - failed:', error);
  }
};

// A3 - Gambling Problem Accounts
const handleGamblingProblemAccounts = async (isDryRun: boolean) => {
  logInfo('handleGamblingProblemAccounts - START', { isDryRun });
  let list;
  try {
    logDebug('handleGamblingProblemAccounts - Starting initial query for gambling problem accounts');
    list = await pg.raw(
      `SELECT
        "personId",
        COUNT(*) AS count,
        COUNT("id") FILTER (WHERE NOT "accountClosed"
          AND NOT "accountSuspended") "activeCount",
        COUNT("id") FILTER (WHERE NOT "accountClosed") "openCount",
        COUNT("id") FILTER (WHERE NOT "accountSuspended") "unsuspendedCount",
        COUNT("id") FILTER (WHERE "gamblingProblem" = TRUE) "gamblingProblemCount",
        COUNT("id") FILTER (WHERE "gamblingProblem" = FALSE) "NotGamblingProblemCount",
        CASE WHEN COUNT("id") FILTER (WHERE "gamblingProblem" = TRUE) > 0 THEN
          TRUE
        ELSE
          FALSE
        END AS "isGamblingProblem",
        array_agg("id") AS "playerIds"
      FROM
        players
      WHERE
        NOT(UPPER(players. "firstName") || ' ' || UPPER(players. "lastName") = 'ANONYMIZED ANONYMIZED'
          AND players. "dateOfBirth" = '1900-01-01')
        AND "personId" IS NOT NULL
        AND NOT "testPlayer"
      GROUP BY
        "personId"
      HAVING
        COUNT("id") > 1
        AND COUNT("id") FILTER (WHERE "gamblingProblem" = TRUE) > 0
        AND COUNT("id") FILTER (WHERE "gamblingProblem" = FALSE) > 0
      ORDER BY
        "unsuspendedCount" DESC,
        "openCount" DESC;`,
    );
    logDebug('handleGamblingProblemAccounts - Completed initial query for gambling problem accounts');
  } catch (error) {
    logError('handleGamblingProblemAccounts - ERROR', error);
  }
  if (!list) {
    logError('handleGamblingProblemAccounts - The gambling problem inital report query failed. Exiting...');
    return;
  }
  const { rows, rowCount } = list;
  if (rowCount === 0) {
    logInfo('handleGamblingProblemAccounts - END - No accounts to deal with');
    return;
  }
  logInfo(`handleGamblingProblemAccounts - Found ${rowCount} personIds related to gambling problem`, rows);
  const batchSize = 100;
  const total = rows.length;
  try {
    for (let i = 0; i < total; i += batchSize) {
      const batchRows = rows.slice(i, i + batchSize);
      logInfo(`handleGamblingProblemAccounts - Processing batch ${i} to ${i + batchSize}`, batchRows);
      for (const [index, row] of batchRows.entries()) {
        await pg.transaction(async (tx) => {
          const { activeCount, count, personId, playerIds, isGamblingProblem } = row;
          if (!isGamblingProblem) {
            logger.warn('!!! 1099 handleGamblingProblemAccounts - There was something wrong with the query, the personId is not a gambling problem account');
            return;
          }
          const idx = i + index;
          const progress = `${((idx / total) * 100).toFixed(2)}% ${idx}/${total}`;
          logDebug(
            `handleGamblingProblemAccounts - [${progress}] Processing info for personId ${personId} with ${count} accounts (${activeCount} active, isGamblingProblem:${isGamblingProblem})`,
            { activeCount, count, personId, playerIds, isGamblingProblem },
          );
          const updateQuery = tx('players')
            .update({ gamblingProblem: true, accountSuspended: true, accountClosed: true })
            .where({ gamblingProblem: false })
            .whereIn('id', playerIds)
            .returning('id');
          try {
            const updatedPlayers = await updateQuery.then((u) => u.map(({ id }) => id));
            logDebug(`handleGamblingProblemAccounts - [${progress}] Updated players: ${updatedPlayers.join(', ')}`);
            if (!isDryRun)
              await Promise.all(updatedPlayers.map((id) => addEvent(id, userId, 'account', 'accountSuspended.true', { accountClosed: true, reasons: ['gambling_problem'] })));
            const closureReasonsToAdd = await tx('players')
              .select('id')
              .whereIn('id', updatedPlayers)
              .whereNotExists((qb) => {
                qb.select('*').from('player_closure_reasons').whereRaw('player_closure_reasons."playerId" = players.id AND type = ?', ['gambling_problem']);
              });
            await Promise.all(closureReasonsToAdd.map(({ id }) => tx('player_closure_reasons').insert({ playerId: id, type: 'gambling_problem', userId })));
            const reason = `The account has been closed and suspended via automated job (Ticket IDXD-1099) due to a linked account closure for reasons related to gambling problems. This action is in line with our commitment to responsible gaming and our policy on linked account management.`;  
            if (!isDryRun) await Promise.all(updatedPlayers.map((id) => addNote(Number(id), userId, reason, tx)));
            logDebug(`handleGamblingProblemAccounts - [${progress}] Closed and suspended ${updatedPlayers.length} players with gambling problems`, { updatedPlayers, reason });
          } catch (updateError) {
            logError(`handleGamblingProblemAccounts - [${progress}] Error updating players for personId ${personId} ROLLEDBACK`, { updateError, query: updateQuery.toString() });
            await tx.rollback();
            return;
          }
          if (isDryRun) {
            await tx.rollback();
            logInfo(`handleGamblingProblemAccounts - [${progress}] ROLLBACK Successful`);
          } else {
            await tx.commit();
            logInfo(`handleGamblingProblemAccounts - [${progress}] COMMIT Successful`);
          }
        });
      }
    }
    logDebug(`handleGamblingProblemAccounts - [100.00%] Finished suspending and closing ${total} personIds with gambling problems`);
  } catch (error) {
    logError('handleGamblingProblemAccounts - failed:', error);
  }
};

// A4 - PEP Accounts
const handlePepAccounts = async (isDryRun: boolean) => {
  logInfo('handlePepAccounts - START', { isDryRun });
  let list;
  try {
    await pg.transaction(async (tx) => {
      list = await tx.raw(
        `SELECT
        "personId",
        COUNT(*) AS count,
        COUNT("id") FILTER (WHERE NOT "accountClosed"
          AND NOT "accountSuspended") "activeCount",
        COUNT("id") FILTER (WHERE "pep" = TRUE) "pepAccounts",
        COUNT("id") FILTER (WHERE "pep" = FALSE) "NotPepAccounts",
        CASE WHEN COUNT("id") FILTER (WHERE "pep" = TRUE) > 0 THEN
          TRUE
        ELSE
          FALSE
        END AS "isPep",
        array_agg("id") AS "playerIds"
      FROM
        players
      WHERE
        NOT(UPPER(players. "firstName") || ' ' || UPPER(players. "lastName") = 'ANONYMIZED ANONYMIZED'
          AND players. "dateOfBirth" = '1900-01-01')
        AND "personId" IS NOT NULL
        AND NOT "testPlayer"
      GROUP BY
        "personId"
      HAVING
        COUNT("id") > 1
        AND COUNT("id") FILTER (WHERE "pep" = TRUE) > 0
        AND COUNT("id") FILTER (WHERE "pep" = FALSE) > 0
      ORDER BY
        "count" DESC;`,
      );
    });
  } catch (error) {
    logError('handlePepAccounts - ERROR', error);
  }
  if (!list) {
    logError('handlePepAccounts - The PEP inital report query failed. Exiting...');
    return;
  }
  const { rows, rowCount } = list;
  if (rowCount === 0) {
    logInfo('handlePepAccounts - END - No accounts to deal with');
    return;
  }
  logInfo(`handlePepAccounts - Found ${rowCount} personIds related to PEP`, rows);
  const batchSize = 100;
  const total = rows.length;
  try {
    for (let i = 0; i < total; i += batchSize) {
      const batchRows = rows.slice(i, i + batchSize);
      logInfo(`handlePepAccounts - Processing batch ${i} to ${i + batchSize}`, batchRows);
      for (const [index, row] of batchRows.entries()) {
        await pg.transaction(async (tx) => {
          const { activeCount, count, personId, playerIds, isPep } = row;
          if (!isPep) {
            logger.warn('!!! 1099 handlePepAccounts - There was something wrong with the query, the personId is not a PEP account');
            return;
          }
          const idx = i + index;
          const progress = `${((idx / total) * 100).toFixed(2)}% ${idx}/${total}`;
          logDebug(`handlePepAccounts - [${progress}] Processing info for personId ${personId} with ${count} accounts (${activeCount} active, isPep:${isPep})`, {
            activeCount,
            count,
            personId,
            playerIds,
            isPep,
          });
          const nonPepAccounts = await tx('players').select('*').whereIn('id', playerIds).where({ pep: false });
          for (const player of nonPepAccounts) {
            if (!isDryRun) {
              await Player.updateAccountStatus(player.id, { pep: true, reason: 'Changing player to be PEP as it is linked with another player who is a PEP' });
              await Player.raiseRiskProfile(player.id, 'high', 'Risk profile changed to high because answered "yes" to PEP questionnaire.');
              await addPlayerFraud(player.id, 'politically_exposed_person', '');
            }
            logDebug(`handlePepAccounts - Updated pep status, raised risk profile and created fraud task for player ${player.id}`);
          }
          if (isDryRun) {
            await tx.rollback();
            logInfo(`handlePepAccounts - [${progress}] ROLLBACK Successful`);
          } else {
            await tx.commit();
            logInfo(`handlePepAccounts - [${progress}] COMMIT Successful`);
          }
        });
      }
    }
    logDebug(`handlePepAccounts - [100.00%] Finished handling ${total} PEP personIds`);
  } catch (error) {
    logError('handlePepAccounts - failed:', error);
  }
};

// Clean Up Person Ids
const cleanUpPersonIds = async (isDryRun: boolean) => {
  logInfo('cleanUpPersonIds - START', { isDryRun });
  try {
    await pg.transaction(async (tx) => {
      const orphanPersonIdsDeleted = await tx('persons').whereNotExists(tx.select('*').from('players').whereRaw('players."personId" = persons.id')).del();
      logDebug(`cleanUpPersonIds - [100.00%] Cleaned up ${orphanPersonIdsDeleted} orphan personIds`);
      if (isDryRun) {
        await tx.rollback();
        logInfo(`cleanUpPersonIds - ROLLBACK Successful`);
      } else {
        await tx.commit();
        logInfo(`cleanUpPersonIds - COMMIT Successful`);
      }
    });
  } catch (error) {
    logError('cleanUpPersonIds - failed:', error);
  }
};

const triggerFraudTasks = async (isDryRun: boolean) => {
  logInfo('triggerFraudTasks - START', { isDryRun });
  let list;
  try {
    await pg.transaction(async (tx) => {
      list = await tx.raw(
        `
SELECT
	*
FROM (
	SELECT
		p.id,
		p. "personId",
		ROW_NUMBER() OVER (PARTITION BY p. "personId" ORDER BY p. "accountSuspended" ASC,
			p. "accountClosed" ASC,
			p. "lastLogin" DESC) AS rank
	FROM
		players p
		INNER JOIN player_events pe ON p.id = pe. "playerId"
	WHERE
		pe. "createdAt" > '2024-06-13'
		AND pe.content LIKE 'Account linkage established via automated job (Ticket IDXD-1099) due to matching First Name + Last Name + DOB.%'
		AND p. "personId" NOT IN( SELECT DISTINCT
			p2. "personId" FROM players p2
			INNER JOIN player_events pe2 ON p2.id = pe2. "playerId"
		WHERE
			pe2.content = 'Fraud tasks checked after account linkage (Ticket IDXD-1099)')) subquery
WHERE
	rank = 1
ORDER BY
	"personId";`,
      );
    });
  } catch (error) {
    logError('triggerFraudTasks - ERROR', error);
    throw error;
  }
  if (!list) {
    logError('triggerFraudTasks - The Fraud Task inital report query failed. Exiting...');
    return;
  }
  const { rows, rowCount } = list;
  if (rowCount === 0) {
    logInfo('triggerFraudTasks - END - No accounts to deal with');
    return;
  }
  logInfo(`triggerFraudTasks - Found ${rowCount} personIds to check Fraud Tasks`, rows);
  const batchSize = 10;
  const total = rows.length;
  try {
    for (let i = 0; i < total; i += batchSize) {
      const batchRows = rows.slice(i, i + batchSize);
      logInfo(`triggerFraudTasks - Processing batch ${i} to ${i + batchSize}`);
      for (const [index, row] of batchRows.entries()) {
        await pg.transaction(async (tx) => {
          const { id, personId } = row;
          const idx = i + index;
          const progress = `${((idx / total) * 100).toFixed(2)}% ${idx}/${total}`;
          logDebug(`triggerFraudTasks - [${progress}] Processing info for personId ${personId} player.id ${id}`);
          try {
            await Deposit.postLinkageCheck(id, tx);
            const note = `Fraud tasks checked after account linkage (Ticket IDXD-1099)`;
            await addNote(id, userId, note, tx);
          } catch (error) {
            logError(`triggerFraudTasks - Error processing personId ${personId} player.id ${id}`, error);
            throw error;
          }
          if (isDryRun) {
            await tx.rollback();
            logInfo(`triggerFraudTasks - [${progress}] ROLLBACK Successful`);
          } else {
            await tx.commit();
            logInfo(`triggerFraudTasks - [${progress}] COMMIT Successful`);
          }
        });
      }
    }
    logDebug(`triggerFraudTasks - [100.00%] Finished handling ${total} players for Fraud Tasks`);
  } catch (error) {
    logError('triggerFraudTasks - failed:', error);
    throw error;
  }
};

module.exports = {
  closeSuspendedAccounts,
  linkAccounts,
  syncVerificationStatus,
  handleAbuseAccounts,
  handleGamblingProblemAccounts,
  handlePepAccounts,
  cleanUpPersonIds,
  triggerFraudTasks,
};
