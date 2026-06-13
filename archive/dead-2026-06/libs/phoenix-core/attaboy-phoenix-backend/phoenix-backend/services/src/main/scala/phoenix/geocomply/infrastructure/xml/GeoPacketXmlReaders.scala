package phoenix.geocomply.infrastructure.xml

import cats.syntax.apply._
import cats.syntax.validated._

import phoenix.core.XmlUtils.DefaultXmlAttributeReaders.optionalNamedAttributeReader
import phoenix.core.XmlUtils.DefaultXmlAttributeReaders.stringAttributeReader
import phoenix.core.XmlUtils.DefaultXmlNodeReaders.stringNodeReader
import phoenix.core.XmlUtils._
import phoenix.geocomply.domain.GeoLocation.AnotherGeolocationInSeconds
import phoenix.geocomply.domain.GeoLocation.ErrorSummaryCause
import phoenix.geocomply.domain.GeoLocation.GeoLocationResult
import phoenix.geocomply.domain.GeoLocation.GeoPacket
import phoenix.geocomply.domain.GeoLocation.TroubleshooterMessage

object GeoPacketXmlReaders {

  implicit val geoLocationResultReader: XmlNodeReader[GeoLocationResult] =
    node => {
      node.text.trim match {
        case "0" => GeoLocationResult.Success.validNel
        case "1" => GeoLocationResult.Failure.validNel
        case _   => GeoLocationResult.Error.validNel
      }
    }

  implicit val errorSummaryCauseReader: XmlNodeReader[ErrorSummaryCause] =
    node => {
      node.label.trim match {
        case "unconfirm_boundary" => ErrorSummaryCause.UnconfirmBoundary.validNel
        case "out_of_boundary"    => ErrorSummaryCause.OutOfBoundary.validNel
        case "blocked_service"    => ErrorSummaryCause.BlockedService.validNel
        case "blocked_software"   => ErrorSummaryCause.BlockedSoftware.validNel
        case "unconfirm_user"     => ErrorSummaryCause.UnconfirmUser.validNel
        case unexpectedValue      => UnexpectedValueError(s"Unexpected value found '$unexpectedValue'").invalidNel
      }
    }

  implicit val anotherGeolocationInSecondsReader: XmlNodeReader[AnotherGeolocationInSeconds] =
    node => {
      try {
        val seconds = node.text.trim.toInt
        AnotherGeolocationInSeconds(seconds).validNel
      } catch {
        case _: Exception =>
          UnexpectedValueError(s"Expected a valid number for TTL but found '${node.text}'").invalidNel
      }
    }

  implicit val troubleshooterMessageReader: XmlNodeReader[TroubleshooterMessage] =
    node => {
      val retry: ValidationResult[Boolean] = node.readAttributeForName[String]("retry").andThen {
        case "1" => true.validNel
        case "0" => false.validNel
        case unexpectedValue =>
          UnexpectedValueError(s"Expected either '0' or '1' but found '$unexpectedValue'").invalidNel
      }
      val message: ValidationResult[String] = node.text.trim.validNel
      val help: ValidationResult[Option[String]] = node.readAttributeForName[Option[String]]("help")
      val optin: ValidationResult[Option[String]] = node.readAttributeForName[Option[String]]("optin")

      (retry, message, help, optin).mapN(TroubleshooterMessage.apply _)
    }

  implicit val encryptedGeoPacketReader: XmlNodeReader[GeoPacket] =
    node => {
      val result: ValidationResult[GeoLocationResult] = node.convertFirstDescendantTo[GeoLocationResult]("error_code")
      val errorMessage: ValidationResult[Option[String]] =
        node.convertDescendantsTo[String]("error_message").map(_.headOption)
      val errorSummaryCauses: ValidationResult[List[ErrorSummaryCause]] =
        (node \ "error_summary" \ "_").convertTo[ErrorSummaryCause]
      val anotherGeolocationInSeconds: ValidationResult[Option[AnotherGeolocationInSeconds]] =
        node.convertDescendantsTo[AnotherGeolocationInSeconds]("geolocate_in").map(_.headOption)
      val troubleshooterMessages: ValidationResult[List[TroubleshooterMessage]] =
        (node \ "troubleshooter").convertDescendantsTo[TroubleshooterMessage]("message")

      (result, errorMessage, errorSummaryCauses, anotherGeolocationInSeconds, troubleshooterMessages).mapN(
        GeoPacket.apply _)
    }
}
