package phoenix.bets.infrastructure.http
import scala.concurrent.ExecutionContext

import io.circe.Encoder._
import sttp.model.StatusCode
import sttp.tapir.Schema._
import sttp.tapir._
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum
import sttp.tapir.generic.auto._

import phoenix.bets.BetProtocol.BetRequest
import phoenix.bets.BetProtocol.BetsStatusRequest
import phoenix.bets.BetStateUpdate
import phoenix.bets.BetsBoundedContext.BetOutcome
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.BetsBoundedContext.BetView
import phoenix.bets.infrastructure.BetJsonFormats._
import phoenix.core.Clock
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.PaginatedResult._
import phoenix.http.core.GeolocationHeader
import phoenix.http.core.TapirAuthDirectives.allowActivePunterEndpointJwt
import phoenix.http.core.TapirAuthDirectives.allowActive_CoolOff_NegativeEndpointJwt
import phoenix.http.routes.EndpointInputs
import phoenix.http.routes.EndpointInputs.enumQueryWithAllValuesAsDefault
import phoenix.http.routes.EndpointInputs.timeRangeFilter
import phoenix.http.routes.HttpBody.jsonBody
import phoenix.jwt.JwtAuthenticator
import phoenix.punters.PuntersBoundedContext

object BetEndpoints extends TapirCodecEnumeratum {

  // DO NOT REMOVE. This is necessary for the schemas of simple id-like types to be generated correctly
  // (plain strings rather than objects with `value` field).
  import phoenix.bets.infrastructure.http.BetTapirSchemas._
  import phoenix.markets.infrastructure.http.MarketTapirSchemas._

  def placeBetEndpoint(
      puntersBoundedContext: PuntersBoundedContext)(implicit auth: JwtAuthenticator, ec: ExecutionContext) =
    allowActivePunterEndpointJwt(puntersBoundedContext).post
      .in("punters" / "bets")
      .in(GeolocationHeader.geolocationHeader)
      .in(jsonBody[List[BetRequest]])
      .out(statusCode(StatusCode.Accepted))
      .out(jsonBody[List[PlaceBetResponse]])

  def betStatusEndpoint(
      puntersBoundedContext: PuntersBoundedContext)(implicit auth: JwtAuthenticator, ec: ExecutionContext) =
    allowActive_CoolOff_NegativeEndpointJwt(puntersBoundedContext).post
      .in("punters" / "bets" / "status")
      .in(jsonBody[BetsStatusRequest])
      .out(jsonBody[List[BetStateUpdate]])
      .out(statusCode(StatusCode.Ok))

  def betHistoryEndpoint(puntersBoundedContext: PuntersBoundedContext)(implicit
      auth: JwtAuthenticator,
      clock: Clock,
      ec: ExecutionContext) =
    allowActive_CoolOff_NegativeEndpointJwt(puntersBoundedContext).get
      .in("punters" / "bets")
      .in(timeRangeFilter.queryParams)
      .in(enumQueryWithAllValuesAsDefault[BetStatus]("filters.status"))
      .in(query[Option[BetOutcome]]("filters.outcome"))
      .in(EndpointInputs.pagination.queryParams)
      .out(jsonBody[PaginatedResult[BetView]])
      .out(statusCode(StatusCode.Ok))

}
