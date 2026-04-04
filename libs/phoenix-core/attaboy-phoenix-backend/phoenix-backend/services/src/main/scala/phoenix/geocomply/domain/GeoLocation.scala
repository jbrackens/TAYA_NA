package phoenix.geocomply.domain

import scala.collection.immutable

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase

object GeoLocation {

  sealed trait GeoLocationResult extends EnumEntry with UpperSnakecase
  object GeoLocationResult extends Enum[GeoLocationResult] {
    override def values: immutable.IndexedSeq[GeoLocationResult] = findValues

    final case object Success extends GeoLocationResult
    final case object Failure extends GeoLocationResult
    final case object Error extends GeoLocationResult
  }

  /**
   * More details in GeoComply documentation: https://eegtech.atlassian.net/wiki/spaces/GMX3/pages/2684977153/Geo+Comply
   * "GeoComply Geolocation Response, XML content v.5.4.0.pdf" (section "error_summary element")
   */
  sealed trait ErrorSummaryCause extends EnumEntry with UpperSnakecase
  object ErrorSummaryCause extends Enum[ErrorSummaryCause] {
    override def values: immutable.IndexedSeq[ErrorSummaryCause] = findValues

    final case object UnconfirmBoundary extends ErrorSummaryCause
    final case object OutOfBoundary extends ErrorSummaryCause
    final case object BlockedService extends ErrorSummaryCause
    final case object BlockedSoftware extends ErrorSummaryCause
    final case object UnconfirmUser extends ErrorSummaryCause
  }

  final case class AnotherGeolocationInSeconds(value: Int)
  final case class TroubleshooterMessage(
      retry: Boolean,
      message: String,
      helpLink: Option[String],
      optInLink: Option[String])

  final case class GeoPacket(
      result: GeoLocationResult,
      errorMessage: Option[String],
      errorSummary: List[ErrorSummaryCause],
      anotherGeolocationInSeconds: Option[AnotherGeolocationInSeconds],
      messages: List[TroubleshooterMessage])

  sealed trait GeoLocationResponse
  final case class GeoLocationPassed(anotherGeolocationInSeconds: AnotherGeolocationInSeconds)
      extends GeoLocationResponse
  final case class GeoLocationRejected(errors: List[ErrorSummaryCause], reasons: List[TroubleshooterMessage])
      extends GeoLocationResponse
}
