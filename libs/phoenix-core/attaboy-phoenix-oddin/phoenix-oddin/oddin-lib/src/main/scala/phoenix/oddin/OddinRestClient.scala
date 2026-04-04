package phoenix.oddin

import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

import akka.actor.ActorSystem
import akka.http.javadsl.model.StatusCodes
import akka.http.scaladsl.marshallers.xml.ScalaXmlSupport
import akka.http.scaladsl.model._
import akka.http.scaladsl.model.headers.{ ModeledCustomHeader, ModeledCustomHeaderCompanion }
import akka.http.scaladsl.unmarshalling.{ Unmarshal, Unmarshaller }
import phoenix.http.core.{ AkkaHttpClient, HttpClient }
import phoenix.oddin.data._

import scala.concurrent.{ ExecutionContext, Future }
import scala.util.Try

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

trait OddinRestClient extends ScalaXmlSupport { this: HttpClient =>
  import Unmarshallers._

  implicit def system: ActorSystem

  val config: OddinConfig
  lazy val requestHeaders = scala.collection.immutable.Seq(`X-Access-Token`(config.accessToken))

  def constructUri(endpoint: String): String =
    s"https://${config.uri}$endpoint"

  private def createRequest(endpoint: String) = {
    HttpRequest(method = HttpMethods.GET, uri = constructUri(endpoint), headers = requestHeaders)
  }

  private def handleResponse[T](response: Future[HttpResponse])(implicit
      um: Unmarshaller[ResponseEntity, T]): Future[T] = {
    implicit val ec: ExecutionContext = system.dispatcher
    response.flatMap {
      case HttpResponse(StatusCodes.OK, _, entity, _) =>
        unmarshal[T](entity)
      case x =>
        throw new RuntimeException(s"Unexpected status code ${x.status}")
    }
  }

  private def unmarshal[T](entity: ResponseEntity)(implicit um: Unmarshaller[ResponseEntity, T]): Future[T] =
    try {
      Unmarshal(entity).to[T]
    } catch {
      case e: Exception =>
        throw new RuntimeException(s"Failed to Unmarshal response", e)
    }

  private def execute[T](request: HttpRequest)(implicit um: Unmarshaller[HttpEntity, T]): Future[T] = {
    val response = sendRequest(request)
    handleResponse[T](response)
  }

  def listAllSports(): Future[Seq[Sport]] = {
    val request = createRequest("/v1/sports/en/sports")
    execute[Seq[Sport]](request)
  }

  def listAllMarketDescriptions(): Future[MarketDescriptions] = {
    val request = createRequest("/v1/descriptions/en/markets")
    execute[MarketDescriptions](request)
  }

  def listAllMatchStatusDescriptions(): Future[Seq[MatchStatus]] = {
    val request = createRequest("/v1/descriptions/en/match_status")
    execute[Seq[MatchStatus]](request)
  }

  def listAllProducers(): Future[Producers] = {
    val request = createRequest("/v1/descriptions/producers")
    execute[Producers](request)
  }

//  def listAllFixturesWithChangesInPreviousDay(): Future[Seq[FixtureChangeVO]] = {
//    val request = createRequest("/v1/sports/en/fixtures/changes")
//    execute[Seq[FixtureChangeVO]](request)
//  }

  def listAllFixtureDetailsForSportEvent(sportEventId: String): Future[Fixture] = {
    val request =
      createRequest(s"/v1/sports/en/sport_events/$sportEventId/fixture")
    execute[Fixture](request)
  }

  def listAllSportEventsForDate(date: ZonedDateTime): Future[Seq[SportEvent]] = {
    val request =
      createRequest(s"/v1/sports/en/schedules/${date.format(DateTimeFormatter.ISO_LOCAL_DATE)}/schedule")
    execute[Seq[SportEvent]](request)
  }

  def listAllCurrentLiveSportEvents(): Future[Seq[SportEvent]] = {
    val request = createRequest("/v1/sports/en/schedules/live/schedule")
    execute[Seq[SportEvent]](request)
  }

  def listAllSportEventsWithPreMatchOdds(start: Int = 0, limit: Int = 1000): Future[Seq[SportEvent]] = {
    val request =
      createRequest(s"/v1/sports/en/schedules/pre/schedule?start=$start&limit=$limit")
    execute[Seq[SportEvent]](request)
  }

  def listAllSportEventsForTournament(tournamentId: String): Future[TournamentSchedule] = {
    val request =
      createRequest(s"/v1/sports/en/tournaments/$tournamentId/schedule")
    execute[TournamentSchedule](request)
  }
}

object OddinRestClient {
  def apply(config: OddinConfig)(implicit system: ActorSystem): OddinRestClient =
    new OddinRestClientImpl(config)
}

class OddinRestClientImpl(val config: OddinConfig)(implicit val system: ActorSystem)
    extends OddinRestClient
    with AkkaHttpClient {}
