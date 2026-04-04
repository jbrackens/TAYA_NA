package phoenix.punters.cooloff

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.syntax.traverse._
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.core.Clock
import phoenix.core.scheduler.ScheduledJob
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext

final class PeriodicCoolOffEnd(punters: PuntersBoundedContext, coolOffRepository: PunterCoolOffRepository, clock: Clock)
    extends ScheduledJob[Unit] {

  private val log: Logger = LoggerFactory.getLogger(getClass)

  override def execute()(implicit ec: ExecutionContext): Future[Unit] =
    for {
      elapsed <- coolOffRepository.findElapsedBefore(clock.currentOffsetDateTime())
      _ <- elapsed.map(punter => tryToEndCoolOff(punters, punter.punterId)).sequence
    } yield ()

  private def tryToEndCoolOff(punters: PuntersBoundedContext, punterId: PunterId)(implicit
      ec: ExecutionContext): Future[Unit] =
    punters
      .endCoolOff(punterId)
      .semiflatTap(_ =>
        Future.successful(log.debug(s"Successfully triggered end of CoolOff period for [punterId = $punterId]")))
      .leftSemiflatTap(err =>
        Future.successful(
          log.error(s"Failed to end CoolOff period for [punterId = $punterId] due to domain error [error = $err]")))
      .value
      .map(_ => ())
}

object PeriodicCoolOffEnd {
  def apply(punters: PuntersBoundedContext, coolOff: PunterCoolOffRepository, clock: Clock): PeriodicCoolOffEnd = {
    new PeriodicCoolOffEnd(punters, coolOff, clock)
  }
}
