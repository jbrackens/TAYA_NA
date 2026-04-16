package phoenix.punters.cooloff

import scala.concurrent.ExecutionContext

import akka.actor.typed.ActorSystem
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.core.Clock
import phoenix.core.scheduler.AkkaScheduler
import phoenix.projections.ProjectionRunner
import phoenix.punters.PunterProtocol.Events.PunterEvent
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersConfig

object PunterCoolOffModule {

  def init(
      punters: PuntersBoundedContext,
      system: ActorSystem[_],
      dbConfig: DatabaseConfig[JdbcProfile],
      projectionRunner: ProjectionRunner[PunterEvent],
      clock: Clock,
      akkaJobScheduler: AkkaScheduler): Unit = {
    implicit val ec: ExecutionContext = system.executionContext
    val puntersConfig = PuntersConfig.of(system)
    val repository = new PunterCoolOffRepository(dbConfig)
    projectionRunner.runProjection(puntersConfig.projections.punterCoolOff, new PunterCoolOffHandler(repository))

    val job = PeriodicCoolOffEnd(punters, repository, clock)
    akkaJobScheduler.scheduleJob(job, puntersConfig.coolOff.periodicWorker)
  }
}
