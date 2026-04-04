package tech.argyll.gmx.predictorgame.services

import tech.argyll.gmx.predictorgame.services.overview._

package object leaderboard {

  type Score = Int
  type Place = Option[Int]

  case class LeaderboardEntry(userSub: String, userName: String, totalScore: Score, totalWon: Int, totalLoss: Int,
                              position: Place, me: Boolean, picks: Seq[OverviewEntry])

}
