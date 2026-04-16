package phoenix.http.routes.backoffice

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext

import cats.syntax.either._
import sttp.model.StatusCode
import sttp.tapir.EndpointInput.PathCapture
import sttp.tapir._
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum
import sttp.tapir.generic.auto._
import sttp.tapir.path
import sttp.tapir.statusCode

import phoenix.core.error.ErrorResponse
import phoenix.core.error.PresentationErrorCode
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.PaginatedResult._
import phoenix.http.core.Routes
import phoenix.http.core.TapirAuthDirectives._
import phoenix.http.routes.EndpointInputs
import phoenix.http.routes.HttpBody.jsonBody
import phoenix.http.routes.backoffice.BackofficeRoutes.MountPoint
import phoenix.jwt.JwtAuthenticator
import phoenix.markets.LifecycleChangeReason.BackofficeCancellation
import phoenix.markets.LifecycleChangeReason.BackofficeChange
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.MarketsBoundedContext._
import phoenix.markets.infrastructure.MarketJsonFormats.{marketIdCodec => _, _}
import phoenix.markets.infrastructure.http.MarketTapirCodecs._
import phoenix.markets.sports.SportEntity.SportId
import phoenix.migrations.MarketsMigrator

private final class MarketBackofficeRoutes(
    basePath: MountPoint,
    markets: MarketsBoundedContext,
    marketsMigrator: MarketsMigrator)(implicit auth: JwtAuthenticator, ec: ExecutionContext)
    extends Routes
    with TapirCodecEnumeratum {

  // DO NOT REMOVE. This is necessary for the schemas of simple id-like types to be generated correctly
  // (plain strings rather than objects with `value` field).
  import phoenix.markets.infrastructure.http.MarketTapirSchemas._

  private val getMarkets =
    adminEndpoint.get
      .in(basePath / "markets")
      .in(EndpointInputs.pagination.queryParams)
      .out(jsonBody[PaginatedResult[TradingMarketNavigationData]])
      .out(statusCode(StatusCode.Ok))

  private val migrateMarkets =
    adminEndpoint.get.in(basePath / "markets" / "migrate" / path[String]("beforeDate")).out(statusCode(StatusCode.Ok))

  private val getMarket =
    adminEndpoint.get
      .in(basePath / "markets" / marketId)
      .out(jsonBody[TradingMarketNavigationData])
      .out(statusCode(StatusCode.Ok))

  private val updateMarketInfo =
    adminEndpoint.put
      .in(basePath / "markets" / marketId)
      .in(jsonBody[MarketInfoUpdateRequest])
      .out(statusCode(StatusCode.NoContent))

  private val changeMarketVisibility =
    adminEndpoint.post
      .in(basePath / "markets" / "visibility" / "change")
      .in(jsonBody[MarketChangeVisibilityRequest])
      .out(statusCode(StatusCode.NoContent))

  private val getMarketCategories =
    adminEndpoint.get
      .in(basePath / "markets" / "categories" / path[SportId])
      .in(EndpointInputs.pagination.queryParams)
      .out(jsonBody[PaginatedResult[MarketCategoryVisibility]])
      .out(statusCode(StatusCode.Ok))

  private val settleMarket =
    adminEndpoint.post
      .in(basePath / "markets" / marketId / "lifecycle" / "settle")
      .in(jsonBody[MarketSettlingRequest])
      .out(statusCode(StatusCode.NoContent))

  private val resettleMarket =
    adminEndpoint.post
      .in(basePath / "markets" / marketId / "lifecycle" / "resettle")
      .in(jsonBody[MarketResettlingRequest])
      .out(statusCode(StatusCode.NoContent))

  private val freezeMarket =
    adminEndpoint.post
      .in(basePath / "markets" / marketId / "lifecycle" / "freeze")
      .out(statusCode(StatusCode.NoContent))

  private val unfreezeMarket =
    adminEndpoint.post
      .in(basePath / "markets" / marketId / "lifecycle" / "unfreeze")
      .out(statusCode(StatusCode.NoContent))

  private val cancelMarket =
    adminEndpoint.post
      .in(basePath / "markets" / marketId / "lifecycle" / "cancel")
      .out(statusCode(StatusCode.NoContent))

  private lazy val marketId: PathCapture[MarketId] = path[MarketId]("marketId")

  private val getMarketsRoute = getMarkets.serverLogic { _ => pagination =>
    markets.getTradingMarkets(pagination).map(_.asRight[ErrorOut])
  }

  private val getMarketRoute = getMarket.serverLogic { _ => marketId =>
    markets
      .getTradingMarket(marketId)
      .leftMap((_: MarketNotFound) => ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.MarketNotFound))
      .value
  }

  private val migrateMarketsRoute = migrateMarkets.serverLogic { _ => beforeDate =>
    val before = OffsetDateTime.parse(beforeDate)
    marketsMigrator.run(before).map(_ => Either.right(()))
  }

  private val updateMarketInfoRoute = updateMarketInfo.serverLogic { _ =>
    {
      case (marketId, update) =>
        markets
          .updateMarketInfo(marketId, update)
          .leftMap((_: MarketNotFound) =>
            ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.MarketNotFound))
          .value
    }
  }

  private val changeMarketVisibilityRoute = changeMarketVisibility.serverLogic { _ => marketVisibilityRequest =>
    markets
      .changeVisibility(
        marketVisibilityRequest.sportId,
        marketVisibilityRequest.marketCategory,
        marketVisibilityRequest.marketVisibility)
      .value
  }

  private val getMarketCategoriesRoute = getMarketCategories.serverLogic { _ =>
    {
      case (sportId, pagination) => markets.getMarketCategories(sportId, pagination).map(Either.right)
    }
  }

  private val settleMarketRoute = settleMarket.serverLogic { _ =>
    {
      case (marketId, settling) =>
        markets
          .settleMarket(marketId, settling.winningSelectionId, BackofficeChange())
          .leftMap {
            case MarketNotFound(_) => ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.MarketNotFound)
            case SelectionNotFound(_, _) =>
              ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.SelectionNotFound)
            case CannotSettleMarket(_, _) | DuplicateSettleMarketEvent(_, _) =>
              ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.CannotSettleMarket)
          }
          .value
    }
  }

  private val resettleMarketRoute = resettleMarket.serverLogic { _ =>
    {
      case (marketId, resettling) =>
        markets
          .resettleMarket(marketId, resettling.winningSelectionId, BackofficeChange(resettling.reason))
          .leftMap {
            case MarketNotFound(_) => ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.MarketNotFound)
            case SelectionNotFound(_, _) =>
              ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.SelectionNotFound)
            case CannotResettleMarket(_, _) =>
              ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.CannotResettleMarket)
          }
          .value
    }
  }

  private val freezeMarketRoute = freezeMarket.serverLogic { _ => marketId =>
    markets
      .freezeMarket(marketId, BackofficeChange())
      .leftMap {
        case MarketNotFound(_) => ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.MarketNotFound)
        case CannotFreezeMarket(_) | DuplicateFreezeMarketEvent(_) =>
          ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.CannotFreezeMarket)
      }
      .value
  }

  private val unfreezeMarketRoute = unfreezeMarket.serverLogic { _ => marketId =>
    markets
      .unfreezeMarket(marketId, BackofficeChange())
      .leftMap {
        case MarketNotFound(_) => ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.MarketNotFound)
        case CannotUnfreezeMarket(_) =>
          ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.CannotUnfreezeMarket)
      }
      .value
  }

  private val cancelMarketRoute = cancelMarket.serverLogic { _ => marketId =>
    markets
      .cancelMarket(marketId, BackofficeCancellation())
      .leftMap {
        case MarketNotFound(_) => ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.MarketNotFound)
        case CannotCancelMarket(_) | DuplicateCancelMarketEvent(_) =>
          ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.CannotCancelMarket)
      }
      .value
  }

  override val endpoints: Routes.Endpoints =
    // TODO (PHXD-750): implement management operations
    List(
      getMarketsRoute,
      migrateMarketsRoute,
      getMarketRoute,
      updateMarketInfoRoute,
      changeMarketVisibilityRoute,
      getMarketCategoriesRoute,
      settleMarketRoute,
      resettleMarketRoute,
      freezeMarketRoute,
      unfreezeMarketRoute,
      cancelMarketRoute)
  // TODO (PHXD-750): add selection alignment routes once we establish contract

}
