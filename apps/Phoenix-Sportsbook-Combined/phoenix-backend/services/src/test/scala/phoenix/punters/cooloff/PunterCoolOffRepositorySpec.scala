package phoenix.punters.cooloff

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.domain.CoolOffCause
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.ProvidedExecutionContext

final class PunterCoolOffRepositorySpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with DatabaseIntegrationSpec
    with ProvidedExecutionContext {

  private val clock = Clock.utcClock
  private val objectUnderTest = new PunterCoolOffRepository(dbConfig)

  "Punter cool-off repository" should {
    val today = clock.currentOffsetDateTime()
    val oneYearAgo = today.minusYears(1)
    val oneMonthAgo = today.minusMonths(1)
    val twoDaysAgo = today.minusDays(2)
    val tomorrow = today.plusDays(1)

    // given
    val elapsedMonthAgo = PunterCoolOff(generatePunterId(), oneYearAgo, oneMonthAgo, CoolOffCause.SelfInitiated)
    val elapsedTwoDaysAgo = PunterCoolOff(generatePunterId(), oneYearAgo, twoDaysAgo, CoolOffCause.SelfInitiated)
    val elapsesTomorrow = PunterCoolOff(generatePunterId(), oneYearAgo, tomorrow, CoolOffCause.SelfInitiated)

    val createCoolOffs = for {
      _ <- objectUnderTest.save(elapsedMonthAgo)
      _ <- objectUnderTest.save(elapsedTwoDaysAgo)
      _ <- objectUnderTest.save(elapsesTomorrow)
    } yield ()
    await(createCoolOffs)

    "find punter account with already elapsed cool-off period" in {
      // when
      val alreadyElapsed = await(objectUnderTest.findElapsedBefore(today))

      // then
      alreadyElapsed shouldBe List(elapsedMonthAgo, elapsedTwoDaysAgo)
    }

    "be able to delete punter account" in {
      // when
      await(objectUnderTest.delete(elapsedTwoDaysAgo.punterId))

      // then
      val elapsedAfterCleanup = await(objectUnderTest.findElapsedBefore(today))
      elapsedAfterCleanup shouldBe List(elapsedMonthAgo)
    }
  }
}
