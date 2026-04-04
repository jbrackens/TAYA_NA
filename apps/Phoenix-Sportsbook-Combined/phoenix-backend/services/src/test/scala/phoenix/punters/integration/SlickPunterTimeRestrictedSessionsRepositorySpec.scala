package phoenix.punters.integration

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.PunterDataGenerator.Api.generateSessionId
import phoenix.punters.domain.SessionRestrictions
import phoenix.punters.domain.TimeRestrictedSession
import phoenix.punters.infrastructure.SlickPunterTimeRestrictedSessionsRepository
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.ProvidedExecutionContext

final class SlickPunterTimeRestrictedSessionsRepositorySpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with DatabaseIntegrationSpec
    with ProvidedExecutionContext {

  private val objectUnderTest = new SlickPunterTimeRestrictedSessionsRepository(dbConfig)
  private val now = Clock.utcClock.currentOffsetDateTime()
  def dateInTheFuture = Clock.utcClock.currentOffsetDateTime().plusMonths(10)

  "Punter sessions repository" should {

    "find already expired punter sessions" in {
      // given
      val withLimitExceededLongTimeAgo = TimeRestrictedSession(
        generateSessionId(),
        generatePunterId(),
        startedAt = now.minusWeeks(3),
        restrictions = Some(SessionRestrictions(validUntil = now.minusWeeks(2), blockUntil = now.plusWeeks(1))),
        refreshTokenTimeout = dateInTheFuture)

      val withLimitExceededRecently = TimeRestrictedSession(
        generateSessionId(),
        generatePunterId(),
        startedAt = now.minusHours(1),
        restrictions = Some(SessionRestrictions(validUntil = now.minusMinutes(5), blockUntil = now.plusWeeks(1))),
        refreshTokenTimeout = dateInTheFuture)

      val ongoingValidSession = TimeRestrictedSession(
        generateSessionId(),
        generatePunterId(),
        startedAt = now.minusHours(1),
        restrictions = Some(SessionRestrictions(validUntil = now.plusMinutes(1), blockUntil = now.plusDays(1))),
        refreshTokenTimeout = dateInTheFuture)

      val createSessions = for {
        _ <- objectUnderTest.upsert(withLimitExceededLongTimeAgo)
        _ <- objectUnderTest.upsert(withLimitExceededRecently)
        _ <- objectUnderTest.upsert(ongoingValidSession)
      } yield ()
      await(createSessions)

      // when
      val alreadyExpired = await(objectUnderTest.findInvalidSessions(reference = now))

      // then
      alreadyExpired shouldBe List(withLimitExceededLongTimeAgo, withLimitExceededRecently)
    }

    "mark a session as ended" in {
      // given
      val expiredSession = TimeRestrictedSession(
        generateSessionId(),
        generatePunterId(),
        startedAt = now.minusWeeks(7),
        restrictions = Some(SessionRestrictions(validUntil = now.minusWeeks(2), blockUntil = now.plusWeeks(1))),
        refreshTokenTimeout = dateInTheFuture)
      await(objectUnderTest.upsert(expiredSession))

      // when
      await(objectUnderTest.delete(expiredSession.sessionId))

      // then
      val alreadyExpired = await(objectUnderTest.findInvalidSessions(reference = now))
      alreadyExpired should not contain expiredSession
    }
  }
}
