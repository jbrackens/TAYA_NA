/* @flow */
const pg = require('gstech-core/modules/pg');

const update = async (day: Date) => {
  const query = `
    WITH DetailedResults AS (
        WITH date_sequence AS (
          SELECT generate_series(
            date_trunc('day', '${day.toISOString()}'::timestamp),
            date_trunc('day', '${day.toISOString()}'::timestamp),
            '1 day'::interval) AS date
        ),
        nrc AS (
            SELECT
                DATE_TRUNC('day', "createdAt") AS date,
                COUNT(*) AS count
            FROM
                players
            WHERE
                "testPlayer" = false
            GROUP BY date
        ),
        ndc AS (
            SELECT
                date_trunc('day', payments.timestamp) AS date,
                COUNT(*) AS count
            FROM
                payments
            WHERE
                payments."paymentType" = 'deposit'
                AND payments.status = 'complete'
                AND payments.index = 0
            GROUP BY
                date
        ),
        active_players AS (
            SELECT
                DATE_TRUNC('day', r.day) AS date,
                COUNT(DISTINCT r."playerId") AS count
            FROM
                report_daily_player_game_summary r
            WHERE
                r."type" = 'bet'
                and amount > 0
            GROUP BY
                date
        ),
        deposits AS (
            SELECT
                date_trunc('day', payments.timestamp) AS date,
                SUM(amount / monthly_conversion_rates."conversionRate") / 100 AS sum
            FROM
                payments
            LEFT JOIN
                players ON payments."playerId" = players.id
            JOIN monthly_conversion_rates ON monthly_conversion_rates."currencyId" = players."currencyId"
                AND monthly_conversion_rates.month = date_trunc('month', payments.timestamp)
            WHERE
                payments."paymentType" = 'deposit'
                AND payments.status = 'complete'
            GROUP BY
                date
        ),
        withdrawals AS (
            SELECT
                date_trunc('day', payment_event_logs.timestamp) AS date,
                SUM(payments.amount / monthly_conversion_rates."conversionRate") / 100 AS sum
            FROM
                payment_event_logs
            LEFT JOIN
                payments on payments.id = payment_event_logs."paymentId"
            LEFT JOIN
                players ON payments."playerId" = players.id
            JOIN monthly_conversion_rates ON monthly_conversion_rates."currencyId" = players."currencyId"
                AND monthly_conversion_rates.month = date_trunc('month', payment_event_logs.timestamp)
            WHERE
                payments."paymentType" = 'withdraw'
                AND payments.status = 'complete'
                AND payment_event_logs.status = 'complete'
            GROUP BY
                date
        ),
        bets AS (
            SELECT
                date_trunc('day', report_daily_brands.day) AS date,
                SUM(
                    CASE
                        WHEN report_daily_brands."type" = 'bet' THEN report_daily_brands.amount / monthly_conversion_rates."conversionRate"
                        WHEN report_daily_brands."type" = 'cancel_bet' THEN -report_daily_brands.amount / monthly_conversion_rates."conversionRate"
                        ELSE 0
                    END
                ) / 100 AS sum
                --((sum(report_daily_brands.amount / "conversionRate") + sum(report_daily_brands."bonusAmount" / "conversionRate")) / 100) / sum(count) as avg
            FROM
                report_daily_brands
            JOIN monthly_conversion_rates ON monthly_conversion_rates."currencyId" = report_daily_brands."currencyId"
                AND monthly_conversion_rates.month = date_trunc('month', report_daily_brands.day)
            WHERE
                report_daily_brands."type" IN ('bet', 'cancel_bet')
            GROUP BY date
        ),
        wins AS (
            SELECT
                date_trunc('day', report_daily_brands.day) AS date,
                SUM(
                    CASE
                        WHEN report_daily_brands."type" = 'win' THEN report_daily_brands.amount / monthly_conversion_rates."conversionRate"
                        WHEN report_daily_brands."type" = 'win_local_jackpot' THEN report_daily_brands.amount / monthly_conversion_rates."conversionRate"
                        WHEN report_daily_brands."type" = 'cancel_win' THEN -report_daily_brands.amount / monthly_conversion_rates."conversionRate"
                        ELSE 0
                    END
                ) / 100 AS sum
            FROM
                report_daily_brands
            JOIN monthly_conversion_rates ON monthly_conversion_rates."currencyId" = report_daily_brands."currencyId"
                AND monthly_conversion_rates.month = date_trunc('month', report_daily_brands.day)
            WHERE
                report_daily_brands."type" IN ('win', 'win_local_jackpot', 'cancel_win')
            GROUP BY date
        ),
        compensations AS (
            SELECT
                date_trunc('day', rdb.day) AS date,
                SUM(
                    CASE
                        WHEN rdb."type" = 'wallet_compensation' THEN rdb.amount / mcr."conversionRate"
                        WHEN rdb."type" = 'wallet_correction' THEN rdb.amount / mcr."conversionRate"
                        WHEN rdb."type" = 'wallet_transaction_fee_return' THEN rdb.amount / mcr."conversionRate"
                        WHEN rdb."type" = 'wallet_transaction_fee' THEN -rdb.amount / mcr."conversionRate"
                        WHEN rdb."type" = 'win_freespins' THEN rdb.amount / mcr."conversionRate"
                        ELSE 0
                    END
                ) / 100 AS sum
            FROM
                report_daily_brands rdb
            JOIN monthly_conversion_rates mcr
                ON mcr."currencyId" = rdb."currencyId"
                AND mcr.month = date_trunc('month', rdb.day)
            WHERE
                rdb."type" IN ('wallet_compensation', 'wallet_correction', 'wallet_transaction_fee_return', 'wallet_transaction_fee', 'win_freespins')
            GROUP BY
                date
        ),
        turn_bonus_to_real AS (
            SELECT
                date_trunc('day', rdb.day) AS date,
                SUM(rdb.amount / mcr."conversionRate") / 100 AS sum
            FROM
                report_daily_brands rdb
            JOIN monthly_conversion_rates mcr
                ON mcr."currencyId" = rdb."currencyId"
                AND mcr.month = date_trunc('month', rdb.day)
            WHERE
                rdb."type" = 'turn_bonus_to_real'
            GROUP BY date
        )
        SELECT
            TO_CHAR(ds.date, 'MM/DD/YYYY') AS "Date",
            COALESCE(nrc.count, 0) AS "NRC",
            COALESCE(ndc.count, 0) AS "NDC",
            CASE
                WHEN COALESCE(nrc.count, 0) = 0 THEN 0
                ELSE COALESCE(ndc.count, 0)::float / COALESCE(nrc.count, 0) * 100
            END AS "Conversion",
            COALESCE(active_players.count, 0) AS "Active Players",
            COALESCE(deposits.sum, 0) AS "Deposits",
            COALESCE(withdrawals.sum, 0) AS "Withdrawals",
            COALESCE(bets.sum, 0) AS "Bets",
            COALESCE(wins.sum, 0) AS "Wins",
            CASE
                WHEN COALESCE(active_players.count, 0) = 0 THEN 0
                ELSE COALESCE(bets.sum, 0) / COALESCE(active_players.count, 0)
            END AS "Average Bet",
            COALESCE(compensations.sum) as "Compensations",
            COALESCE(turn_bonus_to_real.sum) as "Bonus Turned Real",
            COALESCE(bets.sum, 0) - COALESCE(wins.sum, 0) AS "GGR",
            COALESCE(bets.sum, 0) - COALESCE(wins.sum, 0) - COALESCE(compensations.sum) - COALESCE(turn_bonus_to_real.sum) AS "NGR",
            CASE
                WHEN COALESCE(bets.sum, 0) = 0 THEN 0
                ELSE (COALESCE(bets.sum, 0) - COALESCE(wins.sum, 0)) / COALESCE(bets.sum, 0) * 100
            END AS "Margin"
        FROM
            date_sequence ds
        LEFT JOIN nrc
            ON ds.date = nrc.date
        LEFT JOIN ndc
            ON ds.date = ndc.date
        LEFT JOIN active_players
            ON ds.date = active_players.date
        LEFT JOIN deposits
            ON ds.date = deposits.date
        LEFT JOIN withdrawals
            ON ds.date = withdrawals.date
        LEFT JOIN bets
            ON ds.date = bets.date
        LEFT JOIN wins
            ON ds.date = wins.date
        LEFT JOIN compensations
            ON ds.date = compensations.date
        LEFT JOIN turn_bonus_to_real
            ON ds.date = turn_bonus_to_real.date
        ORDER BY
            ds.date DESC
    )
    INSERT INTO report_dsr (
      "day", "conversion", "nrc", "ndc", "activePlayers", "averageBet",
      "bets", "wins", "ggr", "margin", "bonusTurnedReal", "compensations",
      "ngr", "deposits", "withdrawals"
    )
    SELECT
      TO_TIMESTAMP("Date", 'MM/DD/YYYY') AS "day",
      COALESCE("Conversion", 0) AS "conversion",
      COALESCE("NRC", 0) AS "nrc",
      COALESCE("NDC", 0) AS "ndc",
      COALESCE("Active Players", 0) AS "activePlayers",
      COALESCE("Average Bet", 0) AS "averageBet",
      COALESCE("Bets", 0) AS "bets",
      COALESCE("Wins", 0) AS "wins",
      COALESCE("GGR", 0) AS "ggr",
      COALESCE("Margin", 0) AS "margin",
      COALESCE("Bonus Turned Real", 0) AS "bonusTurnedReal",
      COALESCE("Compensations", 0) AS "compensations",
      COALESCE("NGR", 0) AS "ngr",
      COALESCE("Deposits", 0) AS "deposits",
      COALESCE("Withdrawals", 0) AS "withdrawals"
    FROM DetailedResults
    ORDER BY "day" DESC;
  `;
  await pg.transaction(async (tx) => {
    await tx.raw(`DELETE FROM report_dsr WHERE day = date_trunc('day', '${day.toISOString()}'::timestamp)`);
    await tx.raw(query);
  });
};

module.exports = { update };
