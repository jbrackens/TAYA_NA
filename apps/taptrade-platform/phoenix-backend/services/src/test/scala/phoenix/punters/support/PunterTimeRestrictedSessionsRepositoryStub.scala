package phoenix.punters.support

import java.time.OffsetDateTime

import scala.concurrent.Future
import scala.math.Ordered.orderingToOrdered

import phoenix.punters.PuntersBoundedContext.SessionId
import phoenix.punters.domain.PunterTimeRestrictedSessionsRepository
import phoenix.punters.domain.TimeRestrictedSession

final class PunterTimeRestrictedSessionsRepositoryStub(var sessions: List[TimeRestrictedSession] = List.empty)
    extends PunterTimeRestrictedSessionsRepository {

  override def upsert(session: TimeRestrictedSession): Future[Unit] =
    Future.successful { sessions = sessions.filterNot(_.sessionId == session.sessionId) :+ session }

  override def delete(sessionId: SessionId): Future[Unit] =
    Future.successful { sessions = sessions.filterNot(_.sessionId == sessionId) }

  override def findInvalidSessions(reference: OffsetDateTime): Future[List[TimeRestrictedSession]] =
    Future.successful {
      sessions
        .filter(session => session.restrictions.isDefined && session.restrictions.get.validUntil <= reference)
        .sortBy(_.restrictions.get.validUntil)
    }
}
