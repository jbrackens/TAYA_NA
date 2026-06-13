package phoenix.dbviews.infrastructure

import scala.concurrent.Future

import phoenix.dbviews.domain.model.PatronSession
import phoenix.punters.PuntersBoundedContext.SessionId

trait View02PatronSessionsRepository {
  def upsert(patronSession: PatronSession): Future[Unit]
  def get(sessionId: SessionId): Future[Option[PatronSession]]
}
