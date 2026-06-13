package phoenix.reports.application.dataprovider.dge19

import java.time.OffsetDateTime
import java.time.ZoneOffset

import scala.concurrent.ExecutionContext

import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.stream.Materializer
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.core.validation.ValidationException
import phoenix.punters.PunterDataGenerator
import phoenix.punters.PunterDataGenerator.Api.generatePunterName
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterState.ActivationPath
import phoenix.punters.domain.RegistrationOutcome
import phoenix.punters.support
import phoenix.reports.application.dataprovider.aml.ManuallyUnsuspendedPuntersData
import phoenix.reports.domain.PunterProfile
import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.aml.ManuallyUnsuspendedPunters.ManuallyUnsuspendedPuntersReportRow
import phoenix.reports.infrastructure.InMemoryPuntersRepository
import phoenix.support.FutureSupport

final class ManuallyUnsuspendedPuntersDataSpec
    extends ScalaTestWithActorTestKit
    with AnyWordSpecLike
    with Matchers
    with FutureSupport {

  implicit val ec: ExecutionContext = system.executionContext
  implicit val materializer: Materializer = Materializer(system)
  implicit val clock: Clock = Clock.utcClock

  "A ManuallyUnsuspendedPuntersData" should {
    "correctly calculate data when entries exist" in {
      // given
      val reportingDay = OffsetDateTime.of(2021, 5, 19, 0, 0, 0, 0, ZoneOffset.UTC)
      val applicationPuntersRepository = new support.InMemoryPuntersRepository()
      val puntersRepository = new InMemoryPuntersRepository()

      val firstPunter = PunterDataGenerator.generatePunter()
      val registeredAt1 = reportingDay.minusDays(4)
      awaitRight(applicationPuntersRepository.register(firstPunter, registeredAt1))
      awaitRight(
        applicationPuntersRepository
          .markRegistrationFinished(firstPunter.punterId, RegistrationOutcome.Successful, registeredAt1))
      val registeredAt2 = reportingDay.minusDays(5)
      val secondPunter = PunterDataGenerator.generatePunter()
      awaitRight(applicationPuntersRepository.register(secondPunter, registeredAt2))
      awaitRight(
        applicationPuntersRepository
          .markRegistrationFinished(secondPunter.punterId, RegistrationOutcome.Successful, registeredAt2))
      val admin = PunterDataGenerator.generatePunter()
      awaitRight(applicationPuntersRepository.register(admin, registeredAt2))

      val verifiedAt1 = reportingDay.minusDays(5)
      val verifiedAt2 = reportingDay.minusDays(6)

      val name1 = generatePunterName()
      val name2 = generatePunterName()
      await(
        puntersRepository.upsert(PunterProfile(
          firstPunter.punterId,
          name1,
          false,
          ActivationPath.Manual,
          suspensionReason = Some("test"),
          verifiedAt = Some(verifiedAt1),
          verifiedBy = Some(AdminId(admin.punterId.value)))))
      await(
        puntersRepository.upsert(PunterProfile(
          secondPunter.punterId,
          name2,
          false,
          ActivationPath.Manual,
          suspensionReason = None,
          verifiedAt = Some(verifiedAt2),
          verifiedBy = Some(AdminId(admin.punterId.value)))))
      // and
      val objectUnderTest =
        new ManuallyUnsuspendedPuntersData(puntersRepository, applicationPuntersRepository)

      // when
      val reportingPeriod = ReportingPeriod.previousWeek(reportingDay, clock)
      val reportData = await(objectUnderTest.getData(reportingPeriod))

      // then
      reportData should have size 2

      // and
      reportData.find(_.accountId.value == firstPunter.punterId) shouldBe
      Some(
        ManuallyUnsuspendedPuntersReportRow(
          date = DateField(reportingPeriod.periodStart),
          accountId = PatronIdField(firstPunter.punterId),
          fullName = StringField(name1),
          registrationDate = DateField(registeredAt1),
          failureReason = StringField("test"),
          manualVerificationDate = OptionalField.some(DateField(verifiedAt1)),
          verifiedBy = OptionalField.some(FullNameField(admin.details.name)),
          documentsReceived = StringField("N/A")))

      reportData.find(_.accountId.value == secondPunter.punterId) shouldBe
      Some(
        ManuallyUnsuspendedPuntersReportRow(
          date = DateField(reportingPeriod.periodStart),
          accountId = PatronIdField(secondPunter.punterId),
          fullName = StringField(name2),
          registrationDate = DateField(registeredAt2),
          failureReason = StringField("Unknown"),
          manualVerificationDate = OptionalField.some(DateField(verifiedAt2)),
          verifiedBy = OptionalField.some(FullNameField(admin.details.name)),
          documentsReceived = StringField("N/A")))
    }

    "fail to generate the report if punter registration date could not be found" in {
      // given
      val reportingDay = OffsetDateTime.of(2021, 5, 19, 0, 0, 0, 0, ZoneOffset.UTC)
      val applicationPuntersRepository = new support.InMemoryPuntersRepository()
      val puntersRepository = new InMemoryPuntersRepository()

      val firstPunter = PunterDataGenerator.generatePunter()
      awaitRight(applicationPuntersRepository.register(firstPunter, reportingDay.minusDays(4)))
      awaitRight(
        applicationPuntersRepository
          .markRegistrationFinished(firstPunter.punterId, RegistrationOutcome.Successful, reportingDay.minusDays(4)))
      val registeredAt2 = reportingDay.minusDays(5)
      val secondPunter = PunterDataGenerator.generatePunter()
      val admin = PunterDataGenerator.generatePunter()
      awaitRight(applicationPuntersRepository.register(admin, registeredAt2))

      await(
        puntersRepository.upsert(PunterProfile(
          firstPunter.punterId,
          generatePunterName(),
          false,
          ActivationPath.Manual,
          suspensionReason = Some("test"),
          verifiedAt = Some(reportingDay.minusDays(5)),
          verifiedBy = Some(AdminId(admin.punterId.value)))))
      await(
        puntersRepository.upsert(PunterProfile(
          secondPunter.punterId,
          generatePunterName(),
          false,
          ActivationPath.Manual,
          suspensionReason = None,
          verifiedAt = Some(reportingDay.minusDays(6)),
          verifiedBy = Some(AdminId(admin.punterId.value)))))
      // and
      val objectUnderTest =
        new ManuallyUnsuspendedPuntersData(puntersRepository, applicationPuntersRepository)

      // when
      val reportingPeriod = ReportingPeriod.previousWeek(reportingDay, clock)
      val exception = await(objectUnderTest.getData(reportingPeriod).failed)

      // then
      exception should ===(
        ValidationException(s"Could not find registeredAt for punter ${secondPunter.punterId.value}"))
    }

    "generate empty report given no data" in {
      // given
      val puntersRepository = new InMemoryPuntersRepository()
      val applicationPuntersRepository = new support.InMemoryPuntersRepository()

      val objectUnderTest =
        new ManuallyUnsuspendedPuntersData(puntersRepository, applicationPuntersRepository)

      // when
      val today = clock.currentOffsetDateTime()
      val reportingPeriod = ReportingPeriod.enclosingDay(today, clock)

      val reportData = await(objectUnderTest.getData(reportingPeriod))

      // then
      reportData shouldBe empty
    }
  }
}
