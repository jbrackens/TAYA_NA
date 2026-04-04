package phoenix.punters.exclusion.integration

import java.nio.file.Path
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneOffset

import scala.concurrent.ExecutionContext
import scala.concurrent.duration.DurationInt

import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.stream.Materializer
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.ftp.SftpClient
import phoenix.core.ftp.SftpConfig
import phoenix.core.scheduler.ExecutionSchedule.Recurring
import phoenix.core.scheduler.ScheduledJobConfig
import phoenix.http.core.IpAddress
import phoenix.punters.ExcludedUsersReportConfig
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState.SelfExclusionDuration
import phoenix.punters.domain.DateOfBirth
import phoenix.punters.domain.FirstName
import phoenix.punters.domain.LastName
import phoenix.punters.domain.LastSignInData
import phoenix.punters.domain.PersonalName
import phoenix.punters.domain.SignInTimestamp
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.domain.Title
import phoenix.punters.exclusion.domain.DocumentNumber
import phoenix.punters.exclusion.domain.DocumentType
import phoenix.punters.exclusion.domain.LicenseId
import phoenix.punters.exclusion.domain.SelfExcludedPunterReportData
import phoenix.punters.exclusion.domain.SelfExcludedPuntersReport
import phoenix.punters.exclusion.domain.SkinId
import phoenix.punters.exclusion.infrastructure.SftpSelfExcludedPuntersReportPublisher
import phoenix.support.DataGenerator
import phoenix.support.FutureSupport
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.testcontainers.ConnectionProperties
import phoenix.testcontainers.SftpServer

final class SftpSelfExcludedPuntersReportPublisherIntegrationSpecWithVerification
    extends ScalaTestWithActorTestKit
    with AnyWordSpecLike
    with Matchers
    with FutureSupport {

  implicit val materializer: Materializer = Materializer(system)
  implicit val ec: ExecutionContext = system.executionContext

  val sftpServer: SftpServer = SftpServer.instance
  val sftpServerConnection: ConnectionProperties = sftpServer.connectionProperties

  "it should publish the report adding the correct xml header" in {
    val exclusionDirectory = sftpServer.initNewFolder()
    val sftpClient = new SftpClient(
      SftpConfig(
        sftpServerConnection.host,
        sftpServerConnection.port,
        sftpServerConnection.user,
        sftpServerConnection.password,
        exclusionDirectory))
    val reportFileName = "test_report_file.xml"
    val jobConfig = ExcludedUsersReportConfig(
      ScheduledJobConfig("test-job", schedule = Recurring(1.minute), timeRestriction = 1.second, maxRetries = 1),
      directory = "",
      reportFileName,
      SkinId("01"),
      LicenseId("03-02"))
    val reportPublisher = new SftpSelfExcludedPuntersReportPublisher(sftpClient, jobConfig)

    val report = SelfExcludedPuntersReport(
      reportGeneratedAt = LocalDate.of(2012, 10, 8),
      LicenseId("03-02"),
      puntersData = List(
        SelfExcludedPunterReportData(
          PunterId("374b9eb7-6639-419d-abf1-2bb6d690ccc7"),
          SkinId("01"),
          PersonalName(Title("Mr").unsafe(), FirstName("Pol").unsafe(), LastName("Test").unsafe()),
          DataGenerator.randomAddress(),
          FullSSN.fromString("123456789").unsafe(),
          DateOfBirth(day = 1, month = 10, year = 1980),
          excludedAt = OffsetDateTime.of(2021, 1, 5, 12, 34, 2, 0, ZoneOffset.UTC),
          SelfExclusionDuration.OneYear,
          LastSignInData(
            SignInTimestamp(OffsetDateTime.of(2021, 1, 2, 2, 1, 2, 0, ZoneOffset.UTC)),
            IpAddress("172.16.7.24")),
          documentType = DocumentType("PASSPORT"),
          documentNumber = DocumentNumber("123456789"))))

    await(reportPublisher.publish(report))

    val file = awaitSource(sftpClient.read(Path.of(reportFileName))).map(_.utf8String).mkString("")
    file.lines().findFirst().get() should ===("""<?xml version="1.0" encoding="utf-8"?>""")
    file.lines().count() > 3 shouldBe true
  }
}
