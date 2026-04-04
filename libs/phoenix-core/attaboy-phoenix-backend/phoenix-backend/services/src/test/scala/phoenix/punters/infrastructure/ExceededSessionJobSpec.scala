package phoenix.punters.infrastructure

import java.util.concurrent.TimeUnit

import scala.concurrent.duration.FiniteDuration

import org.scalatest.concurrent.Eventually
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.boundedcontexts.punter.MemorizedTestPuntersContext
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext.SessionId
import phoenix.punters.domain.SessionRestrictions
import phoenix.punters.domain.TimeRestrictedSession
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.ConstantUUIDGenerator
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.time.FakeHardcodedClock

class ExceededSessionJobSpec
    extends AnyWordSpec
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with Eventually {

  val punterTimeRestrictedSessionRepository = new SlickPunterTimeRestrictedSessionsRepository(dbConfig)
  implicit val clock = new FakeHardcodedClock()
  val punters = new MemorizedTestPuntersContext()

  val exceedSessionJob = new ExceededSessionsJob(punters, punterTimeRestrictedSessionRepository, clock)
  val now = clock.currentOffsetDateTime()

  "Exceeded Session Job" should {

    "react to expired refresh token" in {
      // given
      val punterId = PunterId(ConstantUUIDGenerator.generate().toString)
      await(punterTimeRestrictedSessionRepository.upsert(
        TimeRestrictedSession(SessionId("SessionId"), punterId, now, None, refreshTokenTimeout = now.minusSeconds(10))))

      // when
      await(exceedSessionJob.execute())

      // then
      punters.endSessions.get().head should ===(punterId)
    }

    "react to session limit reached" in {
      val punterId = PunterId(ConstantUUIDGenerator.generate().toString)

      // given
      await(
        punterTimeRestrictedSessionRepository.upsert(TimeRestrictedSession(
          SessionId("SessionId"),
          punterId,
          now,
          Some(SessionRestrictions(validUntil = now.minusSeconds(10), blockUntil = now.plusHours(3))),
          refreshTokenTimeout = now.plusDays(5))))

      // when
      await(exceedSessionJob.execute())

      // then
      val (cooledPunterId, duration) = punters.coolOffs.get().head
      cooledPunterId should ===(punterId)
      duration should ===(FiniteDuration.apply(3, TimeUnit.HOURS))

      // and
      val expired =
        await(punterTimeRestrictedSessionRepository.findInvalidSessions(now.plusDays(6)))
      expired should have size 0
    }
  }

}
