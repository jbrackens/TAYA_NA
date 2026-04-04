package phoenix.punters

import akka.actor.typed.ActorSystem
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.projections.ProjectionRunner
import phoenix.punters.PunterProtocol.Events.PunterEvent

object PuntersProjectionRunner {
  val build: (ActorSystem[Nothing], DatabaseConfig[JdbcProfile]) => ProjectionRunner[PunterEvent] =
    ProjectionRunner.projectionRunnerFor[PunterEvent](PunterTags.punterTags)(_, _)
}
