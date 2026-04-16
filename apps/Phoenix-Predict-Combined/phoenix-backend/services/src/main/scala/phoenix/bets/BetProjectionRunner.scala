package phoenix.bets

import akka.actor.typed.ActorSystem
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.bets.BetProtocol.Events.BetEvent
import phoenix.projections.ProjectionRunner

object BetProjectionRunner {
  val build: (ActorSystem[Nothing], DatabaseConfig[JdbcProfile]) => ProjectionRunner[BetEvent] =
    ProjectionRunner.projectionRunnerFor[BetEvent](BetTags.betTags)(_, _)
}
