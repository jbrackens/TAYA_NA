package phoenix.punters.unit

import java.time.OffsetDateTime

import scala.concurrent.Future

import org.scalatest.BeforeAndAfterAll
import org.scalatest.LoneElement._
import org.scalatest.enablers.Emptiness.emptinessOfGenTraversable
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.PunterDataGenerator.Api.generateSessionId
import phoenix.punters.PunterProtocol.Events.PunterEvent
import phoenix.punters.PunterProtocol.Events.SessionEnded
import phoenix.punters.PunterProtocol.Events.SessionStarted
import phoenix.punters.PunterProtocol.Events.SessionUpdated
import phoenix.punters.PunterState.StartedSession
import phoenix.punters.application.es.SessionLimitsHandler
import phoenix.punters.domain.PunterTimeRestrictedSessionsRepository
import phoenix.punters.domain.SessionLimitation.Limited
import phoenix.punters.domain.SessionLimitation.Unlimited
import phoenix.punters.domain.SessionRestrictions
import phoenix.punters.domain.TimeRestrictedSession
import phoenix.punters.support.PunterTimeRestrictedSessionsRepositoryStub
import phoenix.support.FutureSupport

final class SessionLimitsHandlerSpec extends AnyWordSpecLike with BeforeAndAfterAll with FutureSupport with Matchers {

  private val now: OffsetDateTime = Clock.utcClock.currentOffsetDateTime()
  def dateInTheFuture = Clock.utcClock.currentOffsetDateTime().plusMonths(10)

  "SessionLimitsHandler" should {
    "handle SessionStarted event (for time restricted sessions)" in new EventHandlerScope {
      // given
      val terminateBefore = now.minusMinutes(1)
      val forbidUntil = now.plusWeeks(1)
      val startedSession = StartedSession(
        generateSessionId(),
        startedAt = now.minusDays(1),
        limitation = Limited(terminateBefore, forbidUntil, dateInTheFuture),
        ipAddress = None)

      // when
      await(handle(SessionStarted(generatePunterId(), startedSession, ipAddress = None)))

      // then
      val sessions = await(sessionsRepo.findInvalidSessions(reference = now))
      sessions should have size 1

      // and
      val session: TimeRestrictedSession = sessions.loneElement
      session.sessionId shouldBe startedSession.sessionId
      session.restrictions.get shouldBe SessionRestrictions(terminateBefore, forbidUntil)
    }

    "handle SessionStarted event (for non restricted sessions)" in new EventHandlerScope {
      // given
      val startedSession: StartedSession =
        StartedSession(
          generateSessionId(),
          startedAt = now.minusDays(1),
          limitation = Unlimited(dateInTheFuture),
          ipAddress = None)

      // when
      await(handle(SessionStarted(generatePunterId(), startedSession, ipAddress = None)))

      // then
      val sessions = await(sessionsRepo.findInvalidSessions(reference = now))
      sessions shouldBe empty
    }

    "handle SessionEnded event (for non restricted sessions)" in new EventHandlerScope {
      // given
      val punterId = generatePunterId()
      val startedSession: StartedSession =
        StartedSession(
          generateSessionId(),
          startedAt = now.minusDays(1),
          limitation = Unlimited(dateInTheFuture),
          ipAddress = None)

      // and
      await(handle(SessionStarted(punterId, startedSession, ipAddress = None)))

      // when
      val sessionEnded = SessionEnded(punterId, startedSession.end(now.minusMinutes(5)))
      await(handle(sessionEnded))

      // then
      val sessions = await(sessionsRepo.findInvalidSessions(reference = now))
      sessions shouldBe empty
    }

    "handle SessionUpdated event" in new EventHandlerScope {
      // given
      val punterId = generatePunterId()
      val terminateBefore = now.minusMinutes(1)
      val forbidUntil = now.plusWeeks(1)
      val startedSession = StartedSession(
        generateSessionId(),
        startedAt = now.minusDays(1),
        limitation = Limited(terminateBefore, forbidUntil, dateInTheFuture),
        ipAddress = None)

      // and
      await(handle(SessionStarted(punterId, startedSession, ipAddress = None)))

      // when
      val newLimitation = Limited(terminateBefore.minusHours(1), forbidUntil.plusHours(1), dateInTheFuture)
      await(handle(SessionUpdated(punterId, startedSession.copy(limitation = newLimitation))))

      // then
      val sessions = await(sessionsRepo.findInvalidSessions(reference = now))
      val session = sessions.loneElement
      session.restrictions.get shouldBe SessionRestrictions(
        validUntil = newLimitation.canBeActiveUntil,
        blockUntil = newLimitation.coolOffUntil)
    }
  }

  private abstract class EventHandlerScope {
    val sessionsRepo: PunterTimeRestrictedSessionsRepository = new PunterTimeRestrictedSessionsRepositoryStub()

    def handle(event: PunterEvent): Future[Unit] =
      SessionLimitsHandler.handle(sessionsRepo)(event)
  }
}
