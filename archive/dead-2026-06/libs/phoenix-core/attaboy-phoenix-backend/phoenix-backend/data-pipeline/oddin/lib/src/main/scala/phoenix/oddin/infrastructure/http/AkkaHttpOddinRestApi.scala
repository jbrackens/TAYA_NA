package phoenix.oddin.infrastructure.http

import scala.annotation.nowarn
import scala.concurrent.Future
import scala.util.Try
import scala.xml.NodeSeq

import akka.actor.typed.ActorSystem
import akka.http.scaladsl.marshallers.xml.ScalaXmlSupport._
import akka.http.scaladsl.model._
import akka.http.scaladsl.model.headers.ModeledCustomHeader
import akka.http.scaladsl.model.headers.ModeledCustomHeaderCompanion
import akka.http.scaladsl.unmarshalling.Unmarshal
import cats.data.EitherT
import cats.syntax.applicativeError._

import phoenix.core.XmlUtils._
import phoenix.http.core.HttpClient
import phoenix.oddin.domain.OddinRestApi._
import phoenix.oddin.domain._
import phoenix.oddin.domain.marketDescription.MarketDescription
import phoenix.oddin.infrastructure.OddinApiConfig
import phoenix.oddin.infrastructure.xml.MarketDescriptionXmlReaders._
import phoenix.oddin.infrastructure.xml.SportEventXmlReaders._
import phoenix.oddin.infrastructure.xml.SportXmlReaders._

final class AkkaHttpOddinRestApi(httpClient: HttpClient, config: OddinApiConfig)(implicit system: ActorSystem[_])
    extends OddinRestApi {
  implicit val ec = system.executionContext

  lazy val requestHeaders = Seq(`X-Access-Token`(config.accessToken))

  override def listAllSports(): EitherT[Future, ListSportsError, List[Sport]] =
    execute[List[Sport]](endpoint = "/v1/sports/en/sports").leftMap(ListSportsError)

  override def listAllCurrentLiveSportEvents(): EitherT[Future, ListLiveSportEventsError, List[LiveSportEvent]] =
    execute[List[LiveSportEvent]](endpoint = "/v1/sports/en/schedules/live/schedule").leftMap(ListLiveSportEventsError)

  override def recovery(after: Long): EitherT[Future, ListLiveSportEventsError, List[LiveSportEvent]] =
    execute[List[LiveSportEvent]](endpoint =
      s"/v1/sports/recovery/initiate_request?after=$after&node_id=${config.nodeId}").leftMap(ListLiveSportEventsError)

  override def listAllSportEventsWithPreMatchOdds(
      start: Int = 0,
      limit: Int = 1000): EitherT[Future, ListSportEventsWithPreMatchOddsError, List[PreMatchSportEvent]] =
    execute[List[PreMatchSportEvent]](endpoint = s"/v1/sports/en/schedules/pre/schedule?start=$start&limit=$limit")
      .leftMap(ListSportEventsWithPreMatchOddsError)

  override def getMatchSummary(sportEventId: OddinSportEventId): EitherT[Future, GetMatchSummaryError, MatchSummary] =
    execute[MatchSummary](endpoint = s"/v1/sports/en/sport_events/${sportEventId.value}/summary")
      .leftMap(GetMatchSummaryError)

  override def listAllMarketDescriptions()
      : EitherT[Future, ListMarketDescriptionsError, List[marketDescription.MarketDescription]] =
    execute[List[MarketDescription]](endpoint = "/v1/descriptions/en/markets").leftMap(ListMarketDescriptionsError)

  private def execute[T](endpoint: String)(implicit reader: XmlNodeReader[T]): EitherT[Future, OddinApiError, T] =
    for {
      response <- sendRequest(createRequest(endpoint))
      result <- handleResponse[T](response)
    } yield result

  private def sendRequest(request: HttpRequest): EitherT[Future, OddinApiError, HttpResponse] =
    httpClient.sendRequest(request).attemptT.leftMap(HttpCallFailed)

  // For the sake of binary compat, HttpResponse is NOT a case class, which causes exhaustiveness check to fail
  @nowarn("cat=other-match-analysis")
  private def handleResponse[T](response: HttpResponse)(implicit
      reader: XmlNodeReader[T]): EitherT[Future, OddinApiError, T] = {
    response match {
      case HttpResponse(StatusCodes.OK, _, entity, _) =>
        handleResponse[T](entity)
      case HttpResponse(statusCode, _, entity, _) =>
        handleUnexpectedHttpResponse(statusCode, entity)
    }
  }

  private def handleUnexpectedHttpResponse[T](
      statusCode: StatusCode,
      entity: HttpEntity): EitherT[Future, OddinApiError, T] =
    EitherT.left(Unmarshal(entity).to[String].map(message => UnexpectedHttpResponse(statusCode.intValue(), message)))

  private def handleResponse[T](entity: HttpEntity)(implicit
      reader: XmlNodeReader[T]): EitherT[Future, OddinApiError, T] =
    for {
      nodeSeq <- unmarshalToXml(entity)
      result <- readXml[T](nodeSeq)
    } yield result

  private def unmarshalToXml(entity: HttpEntity): EitherT[Future, OddinApiError, NodeSeq] =
    Unmarshal(entity).to[NodeSeq].attemptT.leftMap(UnmarshallingFailed)

  private def readXml[T](nodeSeq: NodeSeq)(implicit reader: XmlNodeReader[T]): EitherT[Future, OddinApiError, T] =
    EitherT.fromEither[Future](nodeSeq.convertHead[T].toEither).leftMap[OddinApiError](XmlConversionFailed)

  private def createRequest(endpoint: String) =
    HttpRequest(method = HttpMethods.GET, uri = s"${config.url}$endpoint", headers = requestHeaders)
}

final class `X-Access-Token`(token: String) extends ModeledCustomHeader[`X-Access-Token`] {
  override def renderInRequests = true
  override def renderInResponses = true
  override val companion = `X-Access-Token`
  override def value: String = token
}
object `X-Access-Token` extends ModeledCustomHeaderCompanion[`X-Access-Token`] {
  override val name = "x-access-token"
  override def parse(value: String) = Try(new `X-Access-Token`(value))
}
