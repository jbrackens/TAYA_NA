package phoenix.dbviews.infrastructure

import java.util.concurrent.Executors

import scala.concurrent.ExecutionContext

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.core.deployment.DeploymentClock
import phoenix.dbviews.support.InMemoryView02PatronSessionsRepository
import phoenix.punters.PunterDataGenerator.Api.generateSessionEndedEvent
import phoenix.punters.PunterDataGenerator.Api.generateSessionStartedEvent
import phoenix.shared.support.TimeSupport.deploymentConfig
import phoenix.support.FutureSupport

final class View02PatronSessionsSpec extends AnyWordSpec with Matchers with FutureSupport {
  private implicit val ec: ExecutionContext = ExecutionContext.fromExecutor(Executors.newSingleThreadExecutor())
  private val easternClock = DeploymentClock.fromConfig(deploymentConfig)

  "PatronSessionsProjectionHandlers" should {
    "handle SessionStarted event" in {
      // given
      val puntersViewRepository = new InMemoryView02PatronSessionsRepository(easternClock)

      val event = generateSessionStartedEvent()
      await(View02PatronSessionsProjectionHandler.handle(puntersViewRepository)(event))

      // then
      puntersViewRepository.patronSessions.size shouldBe 1
    }

    "handle SessionEnded event" in {
      // given
      val puntersViewRepository = new InMemoryView02PatronSessionsRepository(easternClock)

      val firstStartedEvent = generateSessionStartedEvent()
      val firstPunterId = firstStartedEvent.punterId
      val firstEndedEvent = generateSessionEndedEvent(firstPunterId)
      await(View02PatronSessionsProjectionHandler.handle(puntersViewRepository)(firstStartedEvent))
      await(View02PatronSessionsProjectionHandler.handle(puntersViewRepository)(firstEndedEvent))

      val secondStartedEvent = generateSessionStartedEvent()
      val secondPunterId = secondStartedEvent.punterId
      val secondEndedEvent = generateSessionEndedEvent(secondPunterId)

      await(View02PatronSessionsProjectionHandler.handle(puntersViewRepository)(secondStartedEvent))
      await(View02PatronSessionsProjectionHandler.handle(puntersViewRepository)(secondEndedEvent))

      // then
      puntersViewRepository.patronSessions.size shouldBe 2
    }
  }
}
