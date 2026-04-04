package phoenix.punters.exclusion.infrastructure

import java.time.LocalDate
import java.time.OffsetDateTime

import scala.xml.Node

import cats.data.Validated
import cats.syntax.apply._

import phoenix.core.XmlUtils.DefaultXmlNodeReaders._
import phoenix.core.XmlUtils.DefaultXmlNodeReaders.enumReader
import phoenix.core.XmlUtils.UnexpectedValueError
import phoenix.core.XmlUtils.XmlFormat
import phoenix.core.XmlUtils.XmlNodeReader
import phoenix.core.XmlUtils._
import phoenix.core.validation.Validation.Validation
import phoenix.punters.domain.SocialSecurityNumber.FullOrPartialSSN
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN
import phoenix.punters.exclusion.domain
import phoenix.punters.exclusion.domain.Address
import phoenix.punters.exclusion.domain.ExcludedPlayer
import phoenix.punters.exclusion.domain.Exclusion
import phoenix.punters.exclusion.domain.ExclusionStatus
import phoenix.punters.exclusion.domain.ExclusionType
import phoenix.punters.exclusion.domain.Name

private[infrastructure] object XmlFormats {

  private implicit val exclusionTypeReader: XmlNodeReader[ExclusionType] = enumReader(ExclusionType)
  private implicit val exclusionStatusReader: XmlNodeReader[ExclusionStatus] = enumReader(ExclusionStatus)
  private implicit object SSNReader extends XmlNodeReader[FullOrPartialSSN] {
    override def read(node: Node): ValidationResult[FullOrPartialSSN] =
      XmlNodeReader
        .read[String](node)
        .andThen(
          ssnString =>
            tryReadFullSSN(ssnString)
              .orElse(tryReadPartialSSN(ssnString))
              .orElse(Validated.invalidNel(UnexpectedValueError(s"Expected 4 or 9 digit number, got $ssnString"))))

    private def tryReadFullSSN(ssnString: String): Validation[FullOrPartialSSN] =
      FullSSN.fromString(ssnString).map(Right(_))

    private def tryReadPartialSSN(ssnString: String): Validation[FullOrPartialSSN] =
      Last4DigitsOfSSN.fromString(ssnString).map(Left(_))
  }

  implicit val excludedPlayerXmlFormat: XmlFormat[ExcludedPlayer] = XmlFormat.readOnly { node =>
    val firstName = (node \\ "First_Name").convertHead[String]
    val middleName = (node \\ "Middle_Name").convertHeadOption[String]
    val lastName = (node \\ "Last_Name").convertHead[String]
    val street1 = (node \\ "Street_Address_1").convertHead[String]
    val street2 = (node \\ "Street_Address_2").convertHeadOption[String]
    val city = (node \\ "City").convertHead[String]
    val state = (node \\ "State").convertHeadOption[String]
    val country = (node \\ "Country").convertHead[String]
    val zipcode = (node \\ "ZIP_Code").convertHead[String]
    val ssn = (node \\ "SSN").convertHeadOption[FullOrPartialSSN]
    val dateOfBirth = (node \\ "DOB").convertHead[LocalDate]
    val exclusionType = (node \\ "Exclusion_Type").convertHead[ExclusionType]
    val exclusionStatus = (node \\ "Status").convertHead[ExclusionStatus]
    val submittedDate = (node \\ "Submitted_Date").convertHead[OffsetDateTime]
    val confirmedDate = (node \\ "Confirmed_Date").convertHeadOption[LocalDate]
    val modifiedDate = (node \\ "Modified_Date").convertHeadOption[LocalDate]
    val removalDate = (node \\ "Removal_Date").convertHeadOption[LocalDate]

    (
      firstName,
      middleName,
      lastName,
      street1,
      street2,
      city,
      state,
      country,
      zipcode,
      ssn,
      dateOfBirth,
      exclusionType,
      exclusionStatus,
      submittedDate,
      confirmedDate,
      modifiedDate,
      removalDate).mapN {
      case (
            firstName,
            middleName,
            lastName,
            street1,
            street2,
            city,
            state,
            country,
            zipcode,
            ssn,
            dateOfBirth,
            exclusionType,
            exclusionStatus,
            submittedDate,
            confirmedDate,
            modifiedDate,
            removalDate) =>
        domain.ExcludedPlayer(
          Name(firstName, middleName, lastName),
          Address(street1, street2, city, state, country, zipcode),
          ssn,
          dateOfBirth,
          Exclusion(exclusionType, exclusionStatus, submittedDate, confirmedDate, modifiedDate, removalDate))
    }
  }
}
