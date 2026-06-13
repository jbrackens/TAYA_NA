package phoenix.oddin.domain

import scala.concurrent.Future

import cats.data.EitherT
import cats.data.NonEmptyList

import phoenix.core.XmlUtils.XmlError
import phoenix.oddin.domain.OddinRestApi.GetMatchSummaryError
import phoenix.oddin.domain.OddinRestApi.ListLiveSportEventsError
import phoenix.oddin.domain.OddinRestApi.ListMarketDescriptionsError
import phoenix.oddin.domain.OddinRestApi.ListSportEventsWithPreMatchOddsError
import phoenix.oddin.domain.OddinRestApi.ListSportsError
import phoenix.oddin.domain.marketDescription.MarketDescription

trait OddinRestApi {

  def listAllSports(): EitherT[Future, ListSportsError, List[Sport]]

  def listAllCurrentLiveSportEvents(): EitherT[Future, ListLiveSportEventsError, List[LiveSportEvent]]

  def listAllSportEventsWithPreMatchOdds(
      start: Int = 0,
      limit: Int = 1000): EitherT[Future, ListSportEventsWithPreMatchOddsError, List[PreMatchSportEvent]]

  def recovery(after: Long): EitherT[Future, ListLiveSportEventsError, List[LiveSportEvent]]

  def getMatchSummary(sportEventId: OddinSportEventId): EitherT[Future, GetMatchSummaryError, MatchSummary]

  def listAllMarketDescriptions(): EitherT[Future, ListMarketDescriptionsError, List[MarketDescription]]
}

object OddinRestApi {

  final case class ListSportsError(cause: OddinApiError)
  final case class ListLiveSportEventsError(cause: OddinApiError)
  final case class ListSportEventsWithPreMatchOddsError(cause: OddinApiError)
  final case class GetMatchSummaryError(cause: OddinApiError)
  final case class ListMarketDescriptionsError(cause: OddinApiError)

  sealed trait OddinApiError
  case class HttpCallFailed(cause: Throwable) extends OddinApiError
  case class UnexpectedHttpResponse(statusCode: Int, message: String) extends OddinApiError
  case class UnmarshallingFailed(cause: Throwable) extends OddinApiError
  case class XmlConversionFailed(errors: NonEmptyList[XmlError]) extends OddinApiError
}
