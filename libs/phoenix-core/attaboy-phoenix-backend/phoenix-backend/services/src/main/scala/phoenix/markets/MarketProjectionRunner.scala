package phoenix.markets

import akka.actor.typed.ActorSystem
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.markets.MarketProtocol.Events.MarketEvent
import phoenix.projections.ProjectionRunner

object MarketProjectionRunner {
  val build: (ActorSystem[Nothing], DatabaseConfig[JdbcProfile]) => ProjectionRunner[MarketEvent] =
    ProjectionRunner.projectionRunnerFor[MarketEvent](MarketTags.marketTags)(_, _)
}
