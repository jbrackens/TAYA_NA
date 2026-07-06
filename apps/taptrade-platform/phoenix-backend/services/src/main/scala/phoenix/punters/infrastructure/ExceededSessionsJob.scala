package phoenix.punters.infrastructure

import java.time.OffsetDateTime
import java.util.concurrent.TimeUnit

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration.Duration
import scala.concurrent.duration.FiniteDuration

import cats.data.EitherT
import cats.syntax.traverse._
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.core.Clock
import phoenix.core.scheduler.ScheduledJob
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersBoundedContext.PunterCoolOffError
import phoenix.punters.domain.CoolOffCause
import phoenix.punters.domain.PunterTimeRestrictedSessionsRepository
import phoenix.punters.domain.TimeRestrictedSession

final class ExceededSessionsJob(
    punters: PuntersBoundedContext,
    sessions: PunterTimeRestrictedSessionsRepository,
    clock: Clock)
    extends ScheduledJob[Unit] {

  private val log: Logger = LoggerFactory.getLogger(getClass)

  override def execute()(implicit ec: ExecutionContext): Future[Unit] = {
    val now = clock.currentOffsetDateTime()
    for {
      sessions <- sessions.findInvalidSessions(reference = now)
      (sessionLimitExpired, refreshTokenExpired) = sessions.partition(isSessionLimitExpired)
      _ <-
        (sessionLimitExpired.map(putPunterInCoolOff(_, now)) ++ refreshTokenExpired.map(expirePunterSession)).sequence
    } yield ()
  }

  private def isSessionLimitExpired(session: TimeRestrictedSession): Boolean =
    session.restrictions.exists(session.refreshTokenTimeout isAfter _.validUntil)

  private def expirePunterSession(session: TimeRestrictedSession)(implicit ec: ExecutionContext): Future[Unit] = {
    punters
      .endSession(session.punterId)
      .semiflatTap(_ =>
        Future.successful(
          log.info(s"Punter [punterId = ${session.punterId}] ended session due to expired refresh token")))
      .value
      .map(_ => ())
  }

  private def putPunterInCoolOff(session: TimeRestrictedSession, terminationDate: OffsetDateTime)(implicit
      ec: ExecutionContext): Future[Unit] = {
    val punterId = session.punterId
    val coolOffDuration = durationBetween(terminationDate, session.restrictions.get.blockUntil)

    val coolOffLogic: EitherT[Future, PunterCoolOffError, Unit] = for {
      _ <- punters.beginCoolOff(punterId, coolOffDuration, CoolOffCause.SessionLimitBreach)
      _ <- EitherT.liftF(sessions.delete(session.sessionId))
    } yield ()

    coolOffLogic
      .semiflatTap(_ => Future.successful(log.info(s"Punter [punterId = $punterId] put into cool-off period")))
      .leftSemiflatTap(error =>
        Future.successful(log.error(
          s"Failed to put punter [punterId = $punterId] in a cool-off period due to domain error [error = $error]")))
      .value
      .map(_ => ())
  }

  private def durationBetween(start: OffsetDateTime, end: OffsetDateTime): FiniteDuration =
    Duration(end.toInstant.toEpochMilli - start.toInstant.toEpochMilli, TimeUnit.MILLISECONDS)
}
