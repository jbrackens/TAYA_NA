package phoenix.reports.application.dataprovider.dge19

import java.time.OffsetDateTime
import java.time.ZoneOffset

import scala.concurrent.ExecutionContext

import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.stream.Materializer
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.punters.PunterDataGenerator
import phoenix.punters.support
import phoenix.reports.application.dataprovider.aml.DeceasedPuntersData
import phoenix.reports.domain.definition.Fields.DateField
import phoenix.reports.domain.definition.Fields.DeviceField
import phoenix.reports.domain.definition.Fields.FullAddressField
import phoenix.reports.domain.definition.Fields.FullNameField
import phoenix.reports.domain.definition.Fields.FullOrPartialSSNField
import phoenix.reports.domain.definition.Fields.IpAddressField
import phoenix.reports.domain.definition.Fields.OptionalField
import phoenix.reports.domain.definition.Fields.PatronIdField
import phoenix.reports.domain.definition.Fields.StringField
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.aml.DeceasedPunters.DeceasedPuntersReportRow
import phoenix.reports.infrastructure.InMemoryDeceasedPuntersRepository
import phoenix.support.FutureSupport

final class DeceasedPuntersDataSpec
    extends ScalaTestWithActorTestKit
    with AnyWordSpecLike
    with Matchers
    with FutureSupport {

  implicit val ec: ExecutionContext = system.executionContext
  implicit val materializer: Materializer = Materializer(system)
  implicit val clock: Clock = Clock.utcClock

  "A DeceasedPuntersData" should {
    "correctly calculate data when entries exist" in {
      // given
      val reportingDay = OffsetDateTime.of(2021, 5, 19, 0, 0, 0, 0, ZoneOffset.UTC)
      val puntersRepository = new support.InMemoryPuntersRepository()

      val firstPunter = PunterDataGenerator.generatePunter()
      val registeredAt1 = clock.currentOffsetDateTime()
      awaitRight(puntersRepository.register(firstPunter, registeredAt1))
      val registeredAt2 = clock.currentOffsetDateTime()
      val secondPunter = PunterDataGenerator.generatePunter()
      awaitRight(puntersRepository.register(secondPunter, registeredAt2))

      val deceasedPuntersRepository = new InMemoryDeceasedPuntersRepository(clock)
      val ipAddress1 = PunterDataGenerator.generateIpAddress()
      val ipAddress2 = PunterDataGenerator.generateIpAddress()
      val device1 = PunterDataGenerator.generateDevice()
      val device2 = PunterDataGenerator.generateDevice()
      await(
        deceasedPuntersRepository
          .save(firstPunter.punterId, reportingDay.minusDays(4), Some(ipAddress1), device = Some(device1)))
      await(
        deceasedPuntersRepository
          .save(secondPunter.punterId, reportingDay.minusDays(5), Some(ipAddress2), device = Some(device2)))

      // and
      val objectUnderTest =
        new DeceasedPuntersData(puntersRepository, deceasedPuntersRepository)

      // when
      val reportingPeriod = ReportingPeriod.previousWeek(reportingDay, clock)
      val reportData = await(objectUnderTest.getData(reportingPeriod))

      // then
      reportData should have size 2

      // and
      reportData.find(_.accountId.value == firstPunter.punterId) shouldBe
      Some(
        DeceasedPuntersReportRow(
          date = DateField(reportingPeriod.periodStart),
          accountId = PatronIdField(firstPunter.punterId),
          fullName = FullNameField(firstPunter.details.name),
          registrationDate = DateField(reportingDay.minusDays(4)),
          address = FullAddressField(firstPunter.details.address),
          ssn = FullOrPartialSSNField(firstPunter.ssn),
          ipAddress = OptionalField.some(IpAddressField(ipAddress1)),
          device = OptionalField.some(DeviceField(device1)),
          additionalInformation = StringField("None")))

      reportData.find(_.accountId.value == secondPunter.punterId) shouldBe
      Some(
        DeceasedPuntersReportRow(
          date = DateField(reportingPeriod.periodStart),
          accountId = PatronIdField(secondPunter.punterId),
          fullName = FullNameField(secondPunter.details.name),
          registrationDate = DateField(reportingDay.minusDays(5)),
          address = FullAddressField(secondPunter.details.address),
          ssn = FullOrPartialSSNField(secondPunter.ssn),
          ipAddress = OptionalField.some(IpAddressField(ipAddress2)),
          device = OptionalField.some(DeviceField(device2)),
          additionalInformation = StringField("None")))
    }

    "generate empty report given no data" in {
      // given
      val puntersRepository = new support.InMemoryPuntersRepository()
      val deceasedPuntersRepository = new InMemoryDeceasedPuntersRepository(clock)

      val objectUnderTest =
        new DeceasedPuntersData(puntersRepository, deceasedPuntersRepository)

      // when
      val today = clock.currentOffsetDateTime()
      val reportingPeriod = ReportingPeriod.enclosingDay(today, clock)

      val reportData = await(objectUnderTest.getData(reportingPeriod))

      // then
      reportData shouldBe empty
    }
  }
}
