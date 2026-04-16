package phoenix.punters.cooloff

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.Events.CoolOffEnded
import phoenix.punters.PunterProtocol.Events.CoolOffExclusionBegan
import phoenix.punters.PunterProtocol.Events.PunterSuspended
import phoenix.punters.PunterState.CoolOffPeriod
import phoenix.punters.domain.CoolOffCause
import phoenix.punters.domain.SuspensionEntity.OperatorSuspend
import phoenix.support.DataGenerator.randomOffsetDateTime
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.ProvidedExecutionContext

final class PunterCoolOffHandlerSpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with DatabaseIntegrationSpec
    with ProvidedExecutionContext {

  private val clock: Clock = Clock.utcClock
  private val repository = new PunterCoolOffRepository(dbConfig)

  "PunterCoolOffHandler" should {
    val today = clock.currentOffsetDateTime()
    val monthAgo = today.minusMonths(1)

    "handle CoolOffExclusionBegan event" in {
      // given
      val punterId = generatePunterId()

      // when
      val event =
        CoolOffExclusionBegan(punterId, CoolOffPeriod(monthAgo, today), CoolOffCause.SelfInitiated, Some(today))
      await(PunterCoolOffHandler.handle(event, repository))

      // then
      findPuntersInCoolOff() should contain(punterId)
    }

    "handle CoolOffStopped event" in {
      // given
      val punterId = generatePunterId()
      await(repository.save(PunterCoolOff(punterId, monthAgo, today, CoolOffCause.SelfInitiated)))

      // when
      val event = CoolOffEnded(punterId, CoolOffCause.SelfInitiated, None)
      await(PunterCoolOffHandler.handle(event, repository))

      // then
      findPuntersInCoolOff() should not contain punterId
    }

    "handle PunterSuspended event" in {
      // given
      val punterId = generatePunterId()
      await(repository.save(PunterCoolOff(punterId, monthAgo, today, CoolOffCause.SelfInitiated)))

      // when
      val event = PunterSuspended(punterId, OperatorSuspend("Because we can"), suspendedAt = randomOffsetDateTime())
      await(PunterCoolOffHandler.handle(event, repository))

      // then
      findPuntersInCoolOff() should not contain punterId
    }

    def findPuntersInCoolOff(): List[PunterId] = {
      val tomorrow = today.plusDays(1)
      await(repository.findElapsedBefore(tomorrow)).map(_.punterId)
    }
  }
}
