package phoenix.punters.idcomply.integration

import scala.concurrent.duration._
import scala.reflect.ClassTag
import scala.util.Random

import cats.syntax.foldable._
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.TimeUtils._
import phoenix.punters.PunterDataGenerator.Api
import phoenix.punters.idcomply.domain.RegistrationEventRepository
import phoenix.punters.idcomply.infrastructure.SlickRegistrationEventRepository
import phoenix.punters.idcomply.support.InMemoryRegistrationEventRepository
import phoenix.punters.idcomply.support.RegistrationDataGenerator._
import phoenix.support.DataGenerator
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.ProvidedExecutionContext
import phoenix.support.TruncatedTables

final class RegistrationEventRepositoryIntegrationSpec
    extends AnyWordSpecLike
    with Matchers
    with DatabaseIntegrationSpec
    with ProvidedExecutionContext
    with FutureSupport
    with TruncatedTables {

  private case class TestSetup[R <: RegistrationEventRepository: ClassTag](constructRepository: () => R) {
    def identifier: String = implicitly[ClassTag[R]].runtimeClass.getSimpleName
  }

  private val liveRepositorySetup = TestSetup(() => {
    truncateTables()
    new SlickRegistrationEventRepository(dbConfig)
  })

  private val testRepositorySetup =
    TestSetup(() => new InMemoryRegistrationEventRepository())

  List(testRepositorySetup, liveRepositorySetup).foreach { testSetup =>
    s"${testSetup.identifier}" should {
      "return the latest event for a specific punter" in {
        val repository = testSetup.constructRepository()
        val punterId = Api.generatePunterId()
        val referenceFirstDateTime = DataGenerator.randomOffsetDateTime()

        val eventsOfOtherPunters = (0 to 10).flatMap(_ => generateRegistrationEvents(Api.generatePunterId()))
        val lastEventOfPunter =
          generatePunterWasAskedForPhotoVerification(punterId).copy(createdAt = referenceFirstDateTime + 10.days)
        val eventOfOtherPunterLaterThanLastEventOfPunter =
          generatePunterSignUpStarted(Api.generatePunterId()).copy(createdAt = lastEventOfPunter.createdAt + 1.second)
        val eventsOfPunter = List(
          generatePunterSignUpStarted(punterId).copy(createdAt = referenceFirstDateTime),
          generatePunterWasAskedQuestions(punterId).copy(createdAt = referenceFirstDateTime + 10.minutes),
          generatePunterAnsweredQuestions(punterId).copy(createdAt = referenceFirstDateTime + 10.hours),
          lastEventOfPunter)

        await(repository.latestEventForId(punterId)) shouldBe None

        await(
          Random
            .shuffle(eventsOfOtherPunters ++ eventsOfPunter :+ eventOfOtherPunterLaterThanLastEventOfPunter)
            .toList
            .traverse_(repository.save))

        await(repository.latestEventForId(punterId)) shouldBe Some(lastEventOfPunter)
      }

      "return events of a specific punter" in {
        val repository = testSetup.constructRepository()
        val punterId = Api.generatePunterId()

        val eventsOfOtherPunters = (0 to 10).flatMap(_ => generateRegistrationEvents(Api.generatePunterId()))
        val eventsOfPunter = generateRegistrationEvents(punterId)

        await(Random.shuffle(eventsOfOtherPunters ++ eventsOfPunter).toList.traverse_(repository.save))

        await(repository.allEvents(punterId)) should contain theSameElementsAs eventsOfPunter
      }
    }
  }
}
