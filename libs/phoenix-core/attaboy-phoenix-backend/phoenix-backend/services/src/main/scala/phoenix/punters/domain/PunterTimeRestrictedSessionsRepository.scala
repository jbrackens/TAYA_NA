package phoenix.punters.domain

import java.time.OffsetDateTime

import scala.concurrent.Future

import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext.SessionId

trait PunterTimeRestrictedSessionsRepository {

  def upsert(session: TimeRestrictedSession): Future[Unit]

  def delete(sessionId: SessionId): Future[Unit]

  def findInvalidSessions(reference: OffsetDateTime): Future[List[TimeRestrictedSession]]
}

final case class TimeRestrictedSession(
    sessionId: SessionId,
    punterId: PunterId,
    startedAt: OffsetDateTime,
    restrictions: Option[SessionRestrictions],
    refreshTokenTimeout: OffsetDateTime)

final case class SessionRestrictions(validUntil: OffsetDateTime, blockUntil: OffsetDateTime)
