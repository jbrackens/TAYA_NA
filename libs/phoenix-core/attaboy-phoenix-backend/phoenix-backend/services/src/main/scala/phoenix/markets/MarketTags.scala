package phoenix.markets

import phoenix.sharding.ProjectionTags.ProjectionTag

object MarketTags {

  val allMarketEventsNotSharded = ProjectionTag("all-market-events")

  val marketTags = Vector(
    ProjectionTag(s"markets-0"),
    ProjectionTag(s"markets-1"),
    ProjectionTag(s"markets-2"),
    ProjectionTag(s"markets-3"),
    ProjectionTag(s"markets-4"),
    ProjectionTag(s"markets-5"),
    ProjectionTag(s"markets-6"),
    ProjectionTag(s"markets-7"),
    ProjectionTag(s"markets-8"),
    ProjectionTag(s"markets-9"))
}
