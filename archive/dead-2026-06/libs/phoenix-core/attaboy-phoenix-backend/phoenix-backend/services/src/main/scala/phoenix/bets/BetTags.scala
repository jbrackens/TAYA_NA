package phoenix.bets

import phoenix.sharding.ProjectionTags.ProjectionTag

object BetTags {

  val allBetEventsNotSharded = ProjectionTag("all-bet-events")

  val betTags: Vector[ProjectionTag] =
    Vector(
      ProjectionTag("bets-0"),
      ProjectionTag("bets-1"),
      ProjectionTag("bets-2"),
      ProjectionTag("bets-3"),
      ProjectionTag("bets-4"),
      ProjectionTag("bets-5"),
      ProjectionTag("bets-6"),
      ProjectionTag("bets-7"),
      ProjectionTag("bets-8"),
      ProjectionTag("bets-9"))
}
