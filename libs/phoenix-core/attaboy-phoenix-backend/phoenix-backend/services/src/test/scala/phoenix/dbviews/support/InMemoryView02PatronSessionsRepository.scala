package phoenix.dbviews.support

import scala.concurrent.Future

import org.scalatest.Assertion
import org.scalatest.matchers.should.Matchers._

import phoenix.core.Clock
import phoenix.dbviews.domain.model._
import phoenix.dbviews.infrastructure.SlickView02PatronSessionsRepository.PatronSessionWithEasternTime
import phoenix.dbviews.infrastructure.View02PatronSessionsRepository
import phoenix.punters.PuntersBoundedContext.SessionId

final class InMemoryView02PatronSessionsRepository(easternClock: Clock) extends View02PatronSessionsRepository {
  import phoenix.dbviews.infrastructure.SlickView02PatronSessionsRepository.PatronSessionWithEasternTime.withEasternTime
  var patronSessions: List[PatronSessionWithEasternTime] = List.empty

  override def upsert(session: PatronSession): Future[Unit] =
    Future.successful {
      patronSessions =
        patronSessions.filter(_.patronSession.sessionId != session.sessionId) :+ withEasternTime(session, easternClock)
    }

  override def get(sessionId: SessionId): Future[Option[PatronSession]] =
    Future.successful {
      patronSessions.find(_.patronSession.sessionId == sessionId).map(_.patronSession)
    }

  def shouldContainDetails(predicate: PatronSession => Boolean): Assertion =
    patronSessions.map(_.patronSession).exists(predicate) shouldBe true
}
