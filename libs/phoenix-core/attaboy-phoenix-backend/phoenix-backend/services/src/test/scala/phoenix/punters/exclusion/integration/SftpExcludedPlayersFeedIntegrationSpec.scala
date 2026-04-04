package phoenix.punters.exclusion.integration

import java.io.BufferedInputStream
import java.nio.file.Path
import java.time.LocalDate
import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext

import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.stream.Materializer
import cats.syntax.either._
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.ftp.SftpClient
import phoenix.core.ftp.SftpConfig
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.exclusion.domain.Address
import phoenix.punters.exclusion.domain.ExcludedPlayer
import phoenix.punters.exclusion.domain.Exclusion
import phoenix.punters.exclusion.domain.ExclusionStatus
import phoenix.punters.exclusion.domain.ExclusionType
import phoenix.punters.exclusion.domain.Name
import phoenix.punters.exclusion.infrastructure.SftpExcludedPlayersFeed
import phoenix.support.FutureSupport
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.testcontainers.ConnectionProperties
import phoenix.testcontainers.SftpServer

final class SftpExcludedPlayersFeedIntegrationSpec
    extends ScalaTestWithActorTestKit
    with AnyWordSpecLike
    with Matchers
    with FutureSupport {

  implicit val materializer: Materializer = Materializer(system)
  implicit val ec: ExecutionContext = system.executionContext

  val sftpServer: SftpServer = SftpServer.instance
  val sftpServerConnection: ConnectionProperties = sftpServer.connectionProperties

  "should parse dge exclusion file" in {
    // given
    val exclusionDirectory = sftpServer.initNewFolder()
    val sftpClient = new SftpClient(
      SftpConfig(
        sftpServerConnection.host,
        sftpServerConnection.port,
        sftpServerConnection.user,
        sftpServerConnection.password,
        exclusionDirectory))
    val objectUnderTest =
      new SftpExcludedPlayersFeed(sftpClient, ingestionFile = Path.of("dge-exclusion-sample.xml"))

    // and
    val exclusionFile = readFileFromResources("data/dge-exclusion-sample.xml")
    await(sftpClient.transfer(exclusionFile, targetFile = Path.of("dge-exclusion-sample.xml")))

    // when
    val rows = awaitSource(objectUnderTest.getExcludedPlayers())

    // then
    rows shouldBe List(
      ExcludedPlayer(
        name = Name(firstName = "NAME", middleName = Some("MNAME"), lastName = "LNAME"),
        address = Address(
          street1 = "STREET1",
          street2 = Some("STREET2"),
          city = "CITY",
          state = Some("NJ"),
          country = "US",
          zipcode = "08560"),
        ssn = Some(FullSSN.fromString("999999999").unsafe().asRight),
        dateOfBirth = LocalDate.parse("1962-12-29"),
        exclusion = Exclusion(
          exclusionType = ExclusionType.Internet,
          status = ExclusionStatus.Active,
          submittedDate = OffsetDateTime.parse("2013-10-31T12:35:01.0-04:00"),
          confirmedDate = None,
          modifiedDate = None,
          removalDate = None)),
      ExcludedPlayer(
        name = Name(firstName = "BETTY", middleName = Some("BETSY"), lastName = "BOLGER"),
        address = Address(
          street1 = "123 MAIN STREET",
          street2 = None,
          city = "LAMBERTVILLE",
          state = Some("NJ"),
          country = "US",
          zipcode = "08560"),
        ssn = Some(FullSSN.fromString("123456789").unsafe().asRight),
        dateOfBirth = LocalDate.parse("1962-12-29"),
        exclusion = Exclusion(
          exclusionType = ExclusionType.Internet,
          status = ExclusionStatus.Active,
          submittedDate = OffsetDateTime.parse("2013-10-31T12:35:01.0-04:00"),
          confirmedDate = Some(LocalDate.parse("2013-10-31")),
          modifiedDate = Some(LocalDate.parse("2013-10-31")),
          removalDate = None)),
      ExcludedPlayer(
        name = Name(firstName = "JULIAN", middleName = Some("JACOB"), lastName = "JACOBSON"),
        address = Address(
          street1 = "123 MAIN STREET",
          street2 = Some("APARTMENT 4A"),
          city = "MONTVALE",
          state = Some("US"),
          country = "US",
          zipcode = "08755"),
        ssn = Some(FullSSN.fromString("123456789").unsafe().asRight),
        dateOfBirth = LocalDate.parse("1962-12-29"),
        exclusion = Exclusion(
          exclusionType = ExclusionType.Internet,
          status = ExclusionStatus.Active,
          submittedDate = OffsetDateTime.parse("2013-10-31T12:35:01.0-04:00"),
          confirmedDate = None,
          modifiedDate = None,
          removalDate = None)),
      ExcludedPlayer(
        name = Name(firstName = "KANAKO", middleName = None, lastName = "SUZUKI"),
        address = Address(
          street1 = "123 CHO",
          street2 = Some("APARTMENT 4A"),
          city = "CHIBA",
          state = None,
          country = "JP",
          zipcode = "99999"),
        ssn = None,
        dateOfBirth = LocalDate.parse("1969-02-25"),
        exclusion = Exclusion(
          exclusionType = ExclusionType.Internet,
          status = ExclusionStatus.Active,
          submittedDate = OffsetDateTime.parse("2013-10-01T07:35:01.0-04:00"),
          confirmedDate = None,
          modifiedDate = None,
          removalDate = None)),
      ExcludedPlayer(
        name = Name(firstName = "TERESA", middleName = None, lastName = "ANDERS"),
        address = Address(
          street1 = "123 SOME ROAD",
          street2 = None,
          city = "TRENTON",
          state = Some("NJ"),
          country = "US",
          zipcode = "08625"),
        ssn = Some(FullSSN.fromString("123454321").unsafe().asRight),
        dateOfBirth = LocalDate.parse("1950-01-01"),
        exclusion = Exclusion(
          exclusionType = ExclusionType.Internet,
          status = ExclusionStatus.Removed,
          submittedDate = OffsetDateTime.parse("2012-10-01T12:35:01.0-04:00"),
          confirmedDate = Some(LocalDate.parse("2012-10-01")),
          modifiedDate = Some(LocalDate.parse("2013-11-01")),
          removalDate = Some(LocalDate.parse("2013-11-01")))),
      ExcludedPlayer(
        name = Name(firstName = "JOSEPH", middleName = Some("JOSEPH"), lastName = "JOSEPH"),
        address = Address(
          street1 = "1436 PUTTY AVENUE",
          street2 = None,
          city = "RIDGELINE",
          state = Some("NJ"),
          country = "US",
          zipcode = "11111"),
        ssn = Some(FullSSN.fromString("066666060").unsafe().asRight),
        dateOfBirth = LocalDate.parse("1942-01-20"),
        exclusion = Exclusion(
          exclusionType = ExclusionType.Division,
          status = ExclusionStatus.Active,
          submittedDate = OffsetDateTime.parse("1995-07-15T00:00:00.0-04:00"),
          confirmedDate = Some(LocalDate.parse("1995-07-15")),
          modifiedDate = None,
          removalDate = None)),
      ExcludedPlayer(
        name = Name(firstName = "ROBERT", middleName = None, lastName = "SMITH"),
        address = Address(
          street1 = "456 SOME AVENUE",
          street2 = None,
          city = "TOMS RIVER",
          state = Some("NJ"),
          country = "US",
          zipcode = "08050"),
        ssn = Some(FullSSN.fromString("888888888").unsafe().asRight),
        dateOfBirth = LocalDate.parse("1950-01-01"),
        exclusion = Exclusion(
          exclusionType = ExclusionType.Property,
          status = ExclusionStatus.Active,
          submittedDate = OffsetDateTime.parse("2012-11-01T12:35:01.0-04:00"),
          confirmedDate = Some(LocalDate.parse("2013-11-01")),
          modifiedDate = None,
          removalDate = None)))
  }

  private def readFileFromResources(path: String): Array[Byte] = {
    val inputStream = new BufferedInputStream(getClass.getClassLoader.getResourceAsStream(path))
    inputStream.readAllBytes()
  }
}
