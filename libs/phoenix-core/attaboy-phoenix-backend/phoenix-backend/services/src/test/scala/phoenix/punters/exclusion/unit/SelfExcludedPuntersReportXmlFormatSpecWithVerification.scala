package phoenix.punters.exclusion.unit

import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneOffset

import scala.xml.Node

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec
import org.scalatest.xml.XmlMatchers._

import phoenix.http.core.IpAddress
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState.SelfExclusionDuration
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.domain._
import phoenix.punters.exclusion.domain.DocumentNumber
import phoenix.punters.exclusion.domain.DocumentType
import phoenix.punters.exclusion.domain.LicenseId
import phoenix.punters.exclusion.domain.SelfExcludedPunterReportData
import phoenix.punters.exclusion.domain.SelfExcludedPuntersReport
import phoenix.punters.exclusion.domain.SkinId
import phoenix.punters.exclusion.infrastructure.SelfExcludedPuntersReportXmlFormat
import phoenix.support.UnsafeValueObjectExtensions._

final class SelfExcludedPuntersReportXmlFormatSpecWithVerification extends AnyWordSpec with Matchers {

  "should format a report with no data" in {
    val emptyReport = SelfExcludedPuntersReport(
      reportGeneratedAt = LocalDate.of(2012, 10, 8),
      LicenseId("03-02"),
      puntersData = List.empty)

    val expectedXML =
      <DGE_Report>
        <Report_Date>2012-10-08</Report_Date>
        <License_ID>03-02</License_ID>
      </DGE_Report>

    SelfExcludedPuntersReportXmlFormat.selfExcludedPuntersReportFormat
      .write(emptyReport) should beXml(expectedXML, ignoreWhitespace = true)
  }

  "should format a report with data" in {
    val reportWithData = SelfExcludedPuntersReport(
      reportGeneratedAt = LocalDate.of(2012, 10, 8),
      LicenseId("03-02"),
      puntersData = List(
        SelfExcludedPunterReportData(
          PunterId("374b9eb7-6639-419d-abf1-2bb6d690ccc7"),
          SkinId("01"),
          PersonalName(Title("Mr").unsafe(), FirstName("Pol").unsafe(), LastName("Test").unsafe()),
          Address(
            AddressLine("Address 1").unsafe(),
            City("New York").unsafe(),
            State("NJ").unsafe(),
            Zipcode("12345").unsafe(),
            Country("US").unsafe()),
          FullSSN.fromString("123456789").unsafe(),
          DateOfBirth(day = 1, month = 10, year = 1980),
          excludedAt = OffsetDateTime.of(2021, 1, 5, 12, 34, 2, 0, ZoneOffset.UTC),
          SelfExclusionDuration.OneYear,
          LastSignInData(
            SignInTimestamp(OffsetDateTime.of(2021, 1, 2, 2, 1, 2, 0, ZoneOffset.UTC)),
            IpAddress("172.16.7.24")),
          documentType = DocumentType("SSN"),
          documentNumber = DocumentNumber("123456789")),
        SelfExcludedPunterReportData(
          PunterId("18da7a24-d9d4-409b-af22-d9b1958367fc"),
          SkinId("04"),
          PersonalName(Title("Mr").unsafe(), FirstName("Roger").unsafe(), LastName("Flor").unsafe()),
          Address(
            AddressLine("Address 1").unsafe(),
            City("New York").unsafe(),
            State("NJ").unsafe(),
            Zipcode("54321").unsafe(),
            Country("US").unsafe()),
          FullSSN.fromString("123456789").unsafe(),
          DateOfBirth(day = 5, month = 2, year = 1982),
          excludedAt = OffsetDateTime.of(2020, 9, 24, 23, 1, 59, 123000000, ZoneOffset.UTC),
          SelfExclusionDuration.FiveYears,
          LastSignInData(
            SignInTimestamp(OffsetDateTime.of(2020, 8, 23, 2, 1, 2, 321000000, ZoneOffset.UTC)),
            IpAddress("255.255.255.255")),
          documentType = DocumentType("PASSPORT"),
          documentNumber = DocumentNumber("987654321"))))

    val expectedXML: Node =
      <DGE_Report>
        <Report_Date>2012-10-08</Report_Date>
        <License_ID>03-02</License_ID>
        <playerData>
          <Player_ID>374b9eb7-6639-419d-abf1-2bb6d690ccc7</Player_ID>
          <Skin_ID>01</Skin_ID>
          <Name>Pol</Name>
          <Surname>Test</Surname>
          <Street_Address_1>Address 1</Street_Address_1>
          <City>New York</City>
          <State>NJ</State>
          <Country>US</Country>
          <ZIP_Code>12345</ZIP_Code>
          <Document_Type>SSN</Document_Type>
          <SSN>123456789</SSN>
          <Personal_ID>123456789</Personal_ID>
          <DOB>1980-10-01</DOB>
          <Submit_Date>2021-01-05T12:34:02.000</Submit_Date>
          <Duration>1 YEAR</Duration>
          <LastLogin>2021-01-02T02:01:02.000</LastLogin>
          <Remote_IP>172.16.7.24</Remote_IP>
        </playerData>
        <playerData>
          <Player_ID>18da7a24-d9d4-409b-af22-d9b1958367fc</Player_ID>
          <Skin_ID>04</Skin_ID>
          <Name>Roger</Name>
          <Surname>Flor</Surname>
          <Street_Address_1>Address 1</Street_Address_1>
          <City>New York</City>
          <State>NJ</State>
          <Country>US</Country>
          <ZIP_Code>54321</ZIP_Code>
          <Document_Type>PASSPORT</Document_Type>
          <SSN>123456789</SSN>
          <Personal_ID>987654321</Personal_ID>
          <DOB>1982-02-05</DOB>
          <Submit_Date>2020-09-24T23:01:59.123</Submit_Date>
          <Duration>5 YEAR</Duration>
          <LastLogin>2020-08-23T02:01:02.321</LastLogin>
          <Remote_IP>255.255.255.255</Remote_IP>
        </playerData>
      </DGE_Report>

    SelfExcludedPuntersReportXmlFormat.selfExcludedPuntersReportFormat
      .write(reportWithData) should beXml(expectedXML, ignoreWhitespace = true)
  }
}
