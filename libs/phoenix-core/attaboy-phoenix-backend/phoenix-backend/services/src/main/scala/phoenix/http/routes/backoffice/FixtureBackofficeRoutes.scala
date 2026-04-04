package phoenix.http.routes.backoffice

import scala.concurrent.ExecutionContext

import cats.syntax.either._
import sttp.model.StatusCode
import sttp.tapir._
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum
import sttp.tapir.generic.auto._
import sttp.tapir.path

import phoenix.core.error.ErrorResponse
import phoenix.core.error.PresentationErrorCode
import phoenix.core.pagination.PaginatedResult
import phoenix.http.core.Routes
import phoenix.http.core.TapirAuthDirectives.ErrorOut
import phoenix.http.core.TapirAuthDirectives.adminEndpoint
import phoenix.http.routes.EndpointInputs
import phoenix.http.routes.HttpBody.jsonBody
import phoenix.http.routes.backoffice.BackofficeRoutes.MountPoint
import phoenix.jwt.JwtAuthenticator
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.MarketsBoundedContext.FixtureInfoUpdateRequest
import phoenix.markets.MarketsBoundedContext.FixtureNotFound
import phoenix.markets.MarketsBoundedContext.TradingFixtureDetails
import phoenix.markets.infrastructure.MarketJsonFormats._
import phoenix.markets.infrastructure.http.MarketTapirCodecs._
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId

private final class FixtureBackofficeRoutes(basePath: MountPoint, markets: MarketsBoundedContext)(implicit
    auth: JwtAuthenticator,
    ec: ExecutionContext)
    extends Routes
    with TapirCodecEnumeratum {

  // DO NOT REMOVE. This is necessary for the schemas of simple id-like types to be generated correctly
  // (plain strings rather than objects with `value` field).
  import phoenix.markets.infrastructure.http.MarketTapirSchemas._

  private val listFixtures = adminEndpoint.get
    .in(basePath / "fixtures")
    .in(EndpointInputs.fixtureFilter.queryParams)
    .in(EndpointInputs.fixtureOrdering.queryParam)
    .in(EndpointInputs.pagination.queryParams)
    .out(jsonBody[PaginatedResult[TradingFixtureDetails]])
    .out(statusCode(StatusCode.Ok))

  private val getFixtureDetails =
    adminEndpoint.get
      .in(basePath / "fixtures" / path[FixtureId])
      .out(jsonBody[TradingFixtureDetails])
      .out(statusCode(StatusCode.Ok))

  private val updateFixtureInfo =
    adminEndpoint.post
      .in(basePath / "sports" / path[SportId] / "fixtures" / path[FixtureId])
      .in(jsonBody[FixtureInfoUpdateRequest])
      .out(statusCode(StatusCode.NoContent))

  private val listFixturesRoute =
    listFixtures.serverLogic { _ =>
      {
        case (fixtureQuery, orderingDirection, pagination) =>
          markets.listTradingFixtures(fixtureQuery, orderingDirection, pagination).map(_.asRight[ErrorOut])
      }
    }

  private val getFixtureDetailsRoute =
    getFixtureDetails.serverLogic { _ => fixtureId =>
      markets
        .getTradingFixture(fixtureId)
        .leftMap((_: FixtureNotFound) =>
          ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.FixtureNotFound))
        .value
    }

  private val updateFixtureInfoRoute =
    updateFixtureInfo.serverLogic { _ =>
      {
        case (sportId, fixtureId, request) =>
          markets
            .updateFixtureInfo(sportId, fixtureId, request)
            .leftMap((_: FixtureNotFound) =>
              ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.FixtureNotFound))
            .value
      }
    }

  override val endpoints: Routes.Endpoints = List(listFixturesRoute, getFixtureDetailsRoute, updateFixtureInfoRoute)

}
