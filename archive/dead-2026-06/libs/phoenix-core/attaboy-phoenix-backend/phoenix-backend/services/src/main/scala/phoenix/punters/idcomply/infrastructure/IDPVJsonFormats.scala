package phoenix.punters.idcomply.infrastructure

import scala.util.Try

import io.circe.Codec
import io.circe.generic.extras.semiauto._
import io.circe.generic.semiauto.deriveCodec

import phoenix.core.JsonFormats._
import phoenix.punters.idcomply.domain.IDPVTokenStatusResponse.FullMatch
import phoenix.punters.idcomply.domain.IDPVTokenStatusResponse.IDPVUserFields._

private[infrastructure] object IDPVJsonFormats {

  private def stringFormattedIntCodec: Codec[Int] = Codec[String].bimapTry[Int](_.toString, t => Try(t.toInt))

  implicit val firstNameIdpvCodec: Codec[FirstName] = deriveUnwrappedCodec
  implicit val lastNameIdpvCodec: Codec[LastName] = deriveUnwrappedCodec
  implicit val givenNameIdpvCodec: Codec[GivenName] = deriveUnwrappedCodec
  implicit val fullNameIdpvCodec: Codec[FullName] = deriveUnwrappedCodec
  implicit val addressIdpvCodec: Codec[Address] = deriveUnwrappedCodec
  implicit val cityIdpvCodec: Codec[City] = deriveUnwrappedCodec
  implicit val zipIdpvCodec: Codec[Zip] = deriveUnwrappedCodec
  implicit val countryIdpvCodec: Codec[Country] = deriveUnwrappedCodec
  implicit val idNumberIdpvCodec: Codec[IdNumber] = deriveUnwrappedCodec
  implicit val idTypeIdpvCodec: Codec[IdType] = deriveUnwrappedCodec
  implicit val dobDayIdpvCodec: Codec[DobDay] = stringFormattedIntCodec.bimap(_.value, DobDay.apply)
  implicit val dobMonthIdpvCodec: Codec[DobMonth] = stringFormattedIntCodec.bimap(_.value, DobMonth.apply)
  implicit val dobYearIdpvCodec: Codec[DobYear] = stringFormattedIntCodec.bimap(_.value, DobYear.apply)
  implicit val expirationDayIdpvCodec: Codec[ExpirationDay] = deriveUnwrappedCodec
  implicit val expirationMonthIdpvCodec: Codec[ExpirationMonth] = deriveUnwrappedCodec
  implicit val expirationYearIdpvCodec: Codec[ExpirationYear] = deriveUnwrappedCodec
  implicit val issueDayIdpvCodec: Codec[IssueDay] = deriveUnwrappedCodec
  implicit val issueMonthIdpvCodec: Codec[IssueMonth] = deriveUnwrappedCodec
  implicit val issueYearIdpvCodec: Codec[IssueYear] = deriveUnwrappedCodec
  implicit val ssnIdpvCodec: Codec[SSN] = deriveUnwrappedCodec
  implicit val fullMatchCodec: Codec[FullMatch] = deriveCodec
}
