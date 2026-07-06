package phoenix.markets.sports

import akka.actor.typed.ActorSystem
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.markets.sports.SportProtocol.Events.SportEvent
import phoenix.projections.ProjectionRunner

object SportsProjectionRunner {
  val build: (ActorSystem[Nothing], DatabaseConfig[JdbcProfile]) => ProjectionRunner[SportEvent] =
    ProjectionRunner.projectionRunnerFor[SportEvent](SportTags.sportTags)(_, _)
}
