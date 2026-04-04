package tech.argyll.gmx.predictorgame.engine.team

import tech.argyll.gmx.predictorgame.Tables.UsersRow

package object leaderboard {

  type Score = Int
  type Place = Option[Int]

  case class UserScore(user: UsersRow, score: Score, eligible: Boolean)

}
