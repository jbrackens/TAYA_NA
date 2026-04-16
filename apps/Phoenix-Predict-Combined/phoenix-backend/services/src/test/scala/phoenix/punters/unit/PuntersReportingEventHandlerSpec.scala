package phoenix.punters.unit

import java.util.concurrent.Executors

import scala.concurrent.ExecutionContext

import org.scalatest.Inspectors
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.punters.PunterDataGenerator.Api._
import phoenix.punters.PunterDataGenerator.Api.generatePunterProfileCreatedEvent
import phoenix.punters.PunterDataGenerator.Api.generatePunterProfileSuspendedEvent
import phoenix.punters.PunterDataGenerator.Api.generatePunterProfileUnsuspendedEvent
import phoenix.punters.PunterDataGenerator._
import phoenix.punters.PunterState.ActivationPath
import phoenix.punters.domain.SuspensionEntity
import phoenix.punters.domain.SuspensionEntity.Deceased
import phoenix.punters.domain.SuspensionEntity.OperatorSuspend
import phoenix.punters.domain.SuspensionEntity.RegistrationIssue
import phoenix.punters.support.{InMemoryPuntersRepository => ApplicationInMemoryPuntersRepository}
import phoenix.reports.application.es.PuntersReportingEventHandler
import phoenix.reports.domain.DeceasedPunters.DeceasedPunterInformation
import phoenix.reports.infrastructure.InMemoryDeceasedPuntersRepository
import phoenix.reports.infrastructure.InMemoryPuntersRepository
import phoenix.support.FutureSupport

class PuntersReportingEventHandlerSpec extends AnyWordSpec with Matchers with FutureSupport with Inspectors {
  private implicit val ec: ExecutionContext = ExecutionContext.fromExecutor(Executors.newSingleThreadExecutor())

  "A PuntersReportingEventHandler" should {

    "add profile on a ProfileCreated event" in {
      val repository = new InMemoryPuntersRepository()
      val applicationPunterRepository = new ApplicationInMemoryPuntersRepository()
      val deceasedPuntersRepository = new InMemoryDeceasedPuntersRepository()
      val profileCreatedEvent = generatePunterProfileCreatedEvent()
      PuntersReportingEventHandler
        .handle(repository, applicationPunterRepository, deceasedPuntersRepository)(profileCreatedEvent)
        .futureValue

      repository.punters.size shouldBe 1
      profileCreatedEvent.punterId shouldBe repository.punters.head.punterId
    }

    "check for other event types" in {
      val repository = new InMemoryPuntersRepository()
      val applicationPunterRepository = new ApplicationInMemoryPuntersRepository()
      val deceasedPuntersRepository = new InMemoryDeceasedPuntersRepository()
      val suspendedEvent = generatePunterProfileSuspendedEvent()
      val unsuspendedEvent = generatePunterProfileUnsuspendedEvent()

      PuntersReportingEventHandler
        .handle(repository, applicationPunterRepository, deceasedPuntersRepository)(suspendedEvent)
        .futureValue
      PuntersReportingEventHandler
        .handle(repository, applicationPunterRepository, deceasedPuntersRepository)(unsuspendedEvent)
        .futureValue

      repository.punters.size shouldBe 0
    }

    "store activation path after punter activation" in {
      val repository = new InMemoryPuntersRepository()
      val applicationPunterRepository = new ApplicationInMemoryPuntersRepository()
      val deceasedPuntersRepository = new InMemoryDeceasedPuntersRepository()

      val profileCreatedEvent = generatePunterProfileCreatedEvent()
      PuntersReportingEventHandler
        .handle(repository, applicationPunterRepository, deceasedPuntersRepository)(profileCreatedEvent)
        .futureValue
      repository.punters.head.activationPath shouldBe ActivationPath.Unknown

      val verifiedEvent = generatePunterVerifiedEvent().copy(punterId = profileCreatedEvent.punterId)
      PuntersReportingEventHandler
        .handle(repository, applicationPunterRepository, deceasedPuntersRepository)(verifiedEvent)
        .futureValue

      repository.punters.head.activationPath shouldBe verifiedEvent.activationPath
    }

    "store deceased punter after Suspended event with deceased " in {
      val repository = new InMemoryPuntersRepository()
      val applicationPunterRepository = new ApplicationInMemoryPuntersRepository()
      val deceasedPuntersRepository = new InMemoryDeceasedPuntersRepository()

      val ipAddress = generateIpAddress()
      val device = generateDevice()
      val punterSuspendedEvent =
        generatePunterProfileSuspendedEvent().copy(entity =
          SuspensionEntity.Deceased(Some(ipAddress), Some(device), "test"))

      PuntersReportingEventHandler
        .handle(repository, applicationPunterRepository, deceasedPuntersRepository)(punterSuspendedEvent)
        .futureValue

      await(deceasedPuntersRepository.getAllDeceasedPunters()).head should ===(
        DeceasedPunterInformation(
          punterSuspendedEvent.punterId,
          punterSuspendedEvent.suspendedAt,
          Some(ipAddress),
          Some(device)))
    }

    "not store deceased punter if Suspended event had different reason" in {
      val repository = new InMemoryPuntersRepository()
      val applicationPunterRepository = new ApplicationInMemoryPuntersRepository()
      val deceasedPuntersRepository = new InMemoryDeceasedPuntersRepository()

      forAll(List(SuspensionEntity.OperatorSuspend("test"), SuspensionEntity.RegistrationIssue.DuplicatedSSN)) {
        suspensionEntity =>
          val punterSuspendedEvent =
            generatePunterProfileSuspendedEvent().copy(entity = suspensionEntity)

          PuntersReportingEventHandler
            .handle(repository, applicationPunterRepository, deceasedPuntersRepository)(punterSuspendedEvent)
            .futureValue

          await(deceasedPuntersRepository.getAllDeceasedPunters()).isEmpty should ===(true)
      }
    }

    "store suspension reason" in {
      val repository = new InMemoryPuntersRepository()
      val applicationPunterRepository = new ApplicationInMemoryPuntersRepository()
      val deceasedPuntersRepository = new InMemoryDeceasedPuntersRepository()

      val profileCreatedEvent = generatePunterProfileCreatedEvent()
      PuntersReportingEventHandler
        .handle(repository, applicationPunterRepository, deceasedPuntersRepository)(profileCreatedEvent)
        .futureValue

      val punterId = repository.punters.head.punterId

      PuntersReportingEventHandler
        .handle(repository, applicationPunterRepository, deceasedPuntersRepository)(
          generatePunterProfileSuspendedEvent().copy(punterId = punterId, entity = OperatorSuspend("operator")))
        .futureValue
      repository.punters.head.suspensionReason should ===(Some("operator"))

      PuntersReportingEventHandler
        .handle(repository, applicationPunterRepository, deceasedPuntersRepository)(
          generatePunterProfileSuspendedEvent().copy(punterId = punterId, entity = RegistrationIssue("registration")))
        .futureValue
      repository.punters.head.suspensionReason should ===(Some("registration"))

      PuntersReportingEventHandler
        .handle(repository, applicationPunterRepository, deceasedPuntersRepository)(
          generatePunterProfileSuspendedEvent().copy(punterId = punterId, entity = Deceased(None, None, "deceased")))
        .futureValue
      repository.punters.head.suspensionReason should ===(Some("deceased"))
    }
  }
}
