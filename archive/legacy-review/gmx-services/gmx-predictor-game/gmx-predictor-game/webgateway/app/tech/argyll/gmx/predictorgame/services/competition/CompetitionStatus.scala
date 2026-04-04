package tech.argyll.gmx.predictorgame.services.competition

import java.time.ZonedDateTime

case class CompetitionStatus(currentRound: Int, maxRounds: Int,
                             currentPickDeadline: Option[ZonedDateTime],
                             availableWeekLeaderboard: Option[Int])