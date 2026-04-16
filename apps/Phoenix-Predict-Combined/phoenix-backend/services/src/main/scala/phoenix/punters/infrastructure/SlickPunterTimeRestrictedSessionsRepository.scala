package phoenix.punters.infrastructure

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.syntax.apply._
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.projections.DomainMappers.phoenixPersistenceIdTypeMapper
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext.SessionId
import phoenix.punters.domain.PunterTimeRestrictedSessionsRepository
import phoenix.punters.domain.SessionRestrictions
import phoenix.punters.domain.TimeRestrictedSession

final class SlickPunterTimeRestrictedSessionsRepository(dbConfig: DatabaseConfig[JdbcProfile])(implicit
    ec: ExecutionContext)
    extends PunterTimeRestrictedSessionsRepository {
  import dbConfig.db

  private val punterSessions: TableQuery[TimerRestrictedSessionsTable] = TableQuery[TimerRestrictedSessionsTable]

  override def upsert(session: TimeRestrictedSession): Future[Unit] =
    db.run(punterSessions.insertOrUpdate(session).map(_ => ()))

  override def delete(sessionId: SessionId): Future[Unit] =
    db.run(punterSessions.filter(_.sessionId === sessionId).delete.map(_ => ()))

  override def findInvalidSessions(reference: OffsetDateTime): Future[List[TimeRestrictedSession]] = {
    val query = punterSessions.filter(row =>
      (row.validUntil.isDefined && row.validUntil < reference) || row.refreshTokenTimeout < reference)
    db.run(query.result).map(_.toList)
  }
}

private final class TimerRestrictedSessionsTable(tag: Tag)
    extends Table[TimeRestrictedSession](tag, "punter_time_restricted_sessions") {
  type TableRow = (SessionId, PunterId, OffsetDateTime, Option[OffsetDateTime], Option[OffsetDateTime], OffsetDateTime)

  def sessionId = column[SessionId]("session_id", O.PrimaryKey)
  def punterId = column[PunterId]("punter_id")
  def startedAt = column[OffsetDateTime]("started_at")
  def validUntil = column[Option[OffsetDateTime]]("valid_until")
  def blockUntil = column[Option[OffsetDateTime]]("block_until")
  def refreshTokenTimeout = column[OffsetDateTime]("refresh_token_timeout")

  def * =
    (sessionId, punterId, startedAt, validUntil, blockUntil, refreshTokenTimeout) <> (fromTableRow, toTableRow)

  private def toTableRow(session: TimeRestrictedSession): Option[TableRow] = {
    val (validUntil, blockUntil) =
      session.restrictions.map(r => (Some(r.validUntil), Some(r.blockUntil))).getOrElse((None, None))
    val refreshTokenTimeout = session.refreshTokenTimeout
    Some((session.sessionId, session.punterId, session.startedAt, validUntil, blockUntil, refreshTokenTimeout))
  }

  private def fromTableRow(row: TableRow): TimeRestrictedSession =
    row match {
      case (sessionId, punterId, startedAt, validUntil, blockUntil, refreshTokenTimeout) =>
        val restrictions = (validUntil, blockUntil).mapN(SessionRestrictions)
        TimeRestrictedSession(sessionId, punterId, startedAt, restrictions, refreshTokenTimeout)
    }
}
