package phoenix.markets.sports

import phoenix.sharding.ProjectionTags.ProjectionTag

object SportTags {

  val allSportEventsNotSharded = ProjectionTag("all-sport-events")

  val sportTags: Vector[ProjectionTag] =
    Vector(
      ProjectionTag("sport-0"),
      ProjectionTag("sport-1"),
      ProjectionTag("sport-2"),
      ProjectionTag("sport-3"),
      ProjectionTag("sport-4"),
      ProjectionTag("sport-5"),
      ProjectionTag("sport-6"),
      ProjectionTag("sport-7"),
      ProjectionTag("sport-8"),
      ProjectionTag("sport-9"))
}
