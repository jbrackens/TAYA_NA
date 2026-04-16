package phoenix.markets.infrastructure.http

import sttp.model.StatusCode
import sttp.tapir._
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum
import sttp.tapir.generic.auto._

import phoenix.core.error.ErrorResponse
import phoenix.core.pagination.PaginatedResult
import phoenix.http.routes.EndpointInputs
import phoenix.http.routes.HttpBody.jsonBody
import phoenix.markets.MarketsBoundedContext.FixtureDetailData
import phoenix.markets.MarketsBoundedContext.FixtureNavigationData
import phoenix.markets.MarketsBoundedContext.SportView
import phoenix.markets.infrastructure.MarketJsonFormats._
import phoenix.markets.infrastructure.http.MarketTapirCodecs._
import phoenix.markets.sports.SportEntity.FixtureId

object MarketEndpoints extends TapirCodecEnumeratum {

  // DO NOT REMOVE. This is necessary for the schemas of simple id-like types to be generated correctly
  // (plain strings rather than objects with `value` field).
  import phoenix.markets.infrastructure.http.MarketTapirSchemas._

  val fixtures =
    endpoint.get
      .in("fixtures")
      .in(EndpointInputs.fixtureFilter.queryParams)
      .in(EndpointInputs.fixtureOrdering.queryParam)
      .in(EndpointInputs.pagination.queryParams)
      .out(jsonBody[PaginatedResult[FixtureNavigationData]])
      .out(statusCode(StatusCode.Ok))
      .errorOut(statusCode)
      .errorOut(jsonBody[ErrorResponse])

  val fixtureDetails =
    endpoint.get
      .in("sports" / path[String]("DEPRECATED") / "fixtures" / path[FixtureId]("fixtureId"))
      .out(jsonBody[FixtureDetailData])
      .out(statusCode(StatusCode.Ok))
      .errorOut(statusCode)
      .errorOut(jsonBody[ErrorResponse])

  val sports =
    endpoint.get
      .in("sports")
      .out(jsonBody[Seq[SportView]])
      .out(statusCode(StatusCode.Ok))
      .errorOut(statusCode)
      .errorOut(jsonBody[ErrorResponse])

}
