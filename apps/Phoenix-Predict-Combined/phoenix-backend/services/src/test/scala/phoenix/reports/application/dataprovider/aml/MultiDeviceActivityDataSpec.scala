package phoenix.reports.application.dataprovider.aml

import java.time.OffsetDateTime
import java.time.ZoneOffset

import scala.concurrent.ExecutionContext

import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.stream.Materializer
import org.scalatest.GivenWhenThen
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.punters.PunterDataGenerator.Api.generatePunterName
import phoenix.punters.PunterDataGenerator.generatePunterDeviceFingerprint
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState.ActivationPath
import phoenix.punters.domain.DeviceFingerprint
import phoenix.punters.domain.PunterDeviceFingerprint
import phoenix.punters.support.InMemoryPunterDeviceFingerprintsRepository
import phoenix.reports.application.PuntersFinder
import phoenix.reports.domain.PunterProfile
import phoenix.reports.domain.definition.Fields.AccountDesignationField
import phoenix.reports.domain.definition.Fields.ConfidenceField
import phoenix.reports.domain.definition.Fields.DateField
import phoenix.reports.domain.definition.Fields.PatronIdField
import phoenix.reports.domain.definition.Fields.VisitorIdField
import phoenix.reports.domain.model.ReportingPeriod.enclosingDay
import phoenix.reports.domain.model.punter.AccountDesignation.TestAccount
import phoenix.reports.domain.template.aml.MultiDeviceActivity.MultiDeviceActivityRow
import phoenix.reports.infrastructure.InMemoryPuntersRepository
import phoenix.support.FutureSupport
import phoenix.time.FakeHardcodedClock

class MultiDeviceActivityDataSpec
    extends ScalaTestWithActorTestKit
    with AnyWordSpecLike
    with Matchers
    with FutureSupport
    with GivenWhenThen {

  implicit val ec: ExecutionContext = system.executionContext
  implicit val materializer: Materializer = Materializer(system)
  implicit val clock: Clock = Clock.utcClock

  private val hardcodedClock = new FakeHardcodedClock(OffsetDateTime.of(2021, 2, 20, 1, 0, 0, 0, ZoneOffset.UTC))
  private val givenReportingPeriod = enclosingDay(hardcodedClock.currentOffsetDateTime(), hardcodedClock)

  val patron1Fingerprint1: PunterDeviceFingerprint = generatePunterDeviceFingerprint(
    PunterId("1111aaaa-1a1a-a1a1-1a1a-1111aaaa1111"))
  val patron2Fingerprint1: PunterDeviceFingerprint = generatePunterDeviceFingerprint(
    PunterId("2222bbbb-2b2b-b2b2-2b2b-2222bbbb2222"))
  val patron2Fingerprint2: PunterDeviceFingerprint = generatePunterDeviceFingerprint(
    PunterId("2222bbbb-2b2b-b2b2-2b2b-2222bbbb2222"))
  val patron2Fingerprint3: PunterDeviceFingerprint = generatePunterDeviceFingerprint(
    PunterId("2222bbbb-2b2b-b2b2-2b2b-2222bbbb2222"))
  val patron2Fingerprint4: PunterDeviceFingerprint = generatePunterDeviceFingerprint(
    PunterId("2222bbbb-2b2b-b2b2-2b2b-2222bbbb2222"))
  val patron3Fingerprint1: PunterDeviceFingerprint = generatePunterDeviceFingerprint(
    PunterId("3333cccc-3c3c-c3c3-3c3c-3333cccc3333"))
  val patron4Fingerprint1: PunterDeviceFingerprint = generatePunterDeviceFingerprint(
    PunterId("4444dddd-4d4d-d4d4-4d4d-4444dddd4444"))
  val patron4Fingerprint2: PunterDeviceFingerprint = generatePunterDeviceFingerprint(
    PunterId("4444dddd-4d4d-d4d4-4d4d-4444dddd4444"))
  val patron4Fingerprint3: PunterDeviceFingerprint = generatePunterDeviceFingerprint(
    PunterId("4444dddd-4d4d-d4d4-4d4d-4444dddd4444"))

  "MultiDeviceActivityData" should {
    "produce an empty report" when {
      "there is no data" in {
        Given("no multi-device activity returned by the repository")
        val punterDeviceFingerprintsRepository = new InMemoryPunterDeviceFingerprintsRepository(clock)()
        val puntersRepository = new InMemoryPuntersRepository()

        val objectUnderTest = new MultiDeviceActivityData(
          puntersFinder = new PuntersFinder(puntersRepository),
          punterDeviceFingerprintsRepository = punterDeviceFingerprintsRepository)

        When("data is aggregated")
        val result = await(objectUnderTest.getData(givenReportingPeriod))

        Then("report should be empty")
        result.size shouldBe (0)
      }

      "there is data but no punter has 3 or more device fingerprints" in {
        val allFingerprints: Seq[PunterDeviceFingerprint] =
          Seq(patron1Fingerprint1, patron2Fingerprint1, patron3Fingerprint1, patron4Fingerprint1)

        Given("multi-device activity returned by the repository")
        val punterDeviceFingerprintsRepository = new InMemoryPunterDeviceFingerprintsRepository(clock)()
        val puntersRepository = new InMemoryPuntersRepository()

        allFingerprints.foreach { fingerprint =>
          await(
            punterDeviceFingerprintsRepository
              .insert(fingerprint.punterId, DeviceFingerprint(fingerprint.visitorId, fingerprint.confidence)))
        }

        allFingerprints.foreach { fingerprint =>
          await(
            puntersRepository.upsert(
              PunterProfile(
                fingerprint.punterId,
                generatePunterName(),
                isTestAccount = true,
                ActivationPath.Manual,
                suspensionReason = None,
                verifiedAt = None,
                verifiedBy = None)))
        }

        val objectUnderTest = new MultiDeviceActivityData(
          puntersFinder = new PuntersFinder(puntersRepository),
          punterDeviceFingerprintsRepository = punterDeviceFingerprintsRepository)

        When("data is aggregated")
        val result = await(objectUnderTest.getData(givenReportingPeriod))

        Then("report should be empty")
        result.size shouldBe (0)
      }

    }

    "present each device activity individually" in {
      val randomlySortedFingerprints: Seq[PunterDeviceFingerprint] = Seq(
        patron4Fingerprint1,
        patron3Fingerprint1,
        patron4Fingerprint2,
        patron1Fingerprint1,
        patron2Fingerprint1,
        patron2Fingerprint2,
        patron2Fingerprint3,
        patron4Fingerprint3,
        patron2Fingerprint4)

      Given("a punter has at least 3 device fingerprints")
      val punterDeviceFingerprintsRepository = new InMemoryPunterDeviceFingerprintsRepository(hardcodedClock)()
      val puntersRepository = new InMemoryPuntersRepository()

      randomlySortedFingerprints.foreach { fingerprint =>
        await(
          punterDeviceFingerprintsRepository
            .insert(fingerprint.punterId, DeviceFingerprint(fingerprint.visitorId, fingerprint.confidence)))
      }

      randomlySortedFingerprints.foreach { fingerprint =>
        await(
          puntersRepository.upsert(
            PunterProfile(
              fingerprint.punterId,
              generatePunterName(),
              isTestAccount = true,
              ActivationPath.Manual,
              suspensionReason = None,
              verifiedAt = None,
              verifiedBy = None)))
      }

      val objectUnderTest = new MultiDeviceActivityData(
        puntersFinder = new PuntersFinder(puntersRepository),
        punterDeviceFingerprintsRepository = punterDeviceFingerprintsRepository)

      When("data is aggregated")
      val result: Seq[MultiDeviceActivityRow] = await(objectUnderTest.getData(givenReportingPeriod))

      Then("report should have 7 rows")
      result.size shouldBe (7)

      And("results should not include Patrons with less than 3 fingerprints")
      result.map { _.patronId.value } should contain noneOf (patron1Fingerprint1.punterId,
      patron3Fingerprint1.punterId)

      And("results should be sorted by Patron ID")
      result(0) shouldBe MultiDeviceActivityRow(
        gamingDate = DateField(givenReportingPeriod.periodStart),
        patronId = PatronIdField(patron2Fingerprint1.punterId),
        accountDesignation = AccountDesignationField(TestAccount),
        visitorId = VisitorIdField(patron2Fingerprint1.visitorId),
        confidence = ConfidenceField(patron2Fingerprint1.confidence))

      result(3) shouldBe MultiDeviceActivityRow(
        gamingDate = DateField(givenReportingPeriod.periodStart),
        patronId = PatronIdField(patron2Fingerprint4.punterId),
        accountDesignation = AccountDesignationField(TestAccount),
        visitorId = VisitorIdField(patron2Fingerprint4.visitorId),
        confidence = ConfidenceField(patron2Fingerprint4.confidence))

      result(4) shouldBe MultiDeviceActivityRow(
        gamingDate = DateField(givenReportingPeriod.periodStart),
        patronId = PatronIdField(patron4Fingerprint1.punterId),
        accountDesignation = AccountDesignationField(TestAccount),
        visitorId = VisitorIdField(patron4Fingerprint1.visitorId),
        confidence = ConfidenceField(patron4Fingerprint1.confidence))

      result(6) shouldBe MultiDeviceActivityRow(
        gamingDate = DateField(givenReportingPeriod.periodStart),
        patronId = PatronIdField(patron4Fingerprint3.punterId),
        accountDesignation = AccountDesignationField(TestAccount),
        visitorId = VisitorIdField(patron4Fingerprint3.visitorId),
        confidence = ConfidenceField(patron4Fingerprint3.confidence))
    }
  }

}
