package phoenix.prediction.infrastructure.http

import scala.concurrent.ExecutionContext

import cats.syntax.either._
import io.circe.generic.auto._
import sttp.model.StatusCode
import sttp.tapir._
import sttp.tapir.generic.auto._

import phoenix.core.error.ErrorResponse
import phoenix.core.error.ErrorDetails
import phoenix.core.error.PresentationError
import phoenix.core.error.PresentationErrorCode
import phoenix.http.core.Routes
import phoenix.http.core.TapirAuthDirectives._
import phoenix.http.routes.HttpBody.jsonBody
import phoenix.http.routes.backoffice.BackofficeRoutes.MountPoint
import phoenix.jwt.JwtAuthenticator
import phoenix.prediction.application.CoordinatedPredictionMarketCommandService
import phoenix.prediction.application.PredictionMarketCommand
import phoenix.prediction.application.PredictionMarketCommandService
import phoenix.prediction.application.PredictionLifecycleCoordinator
import phoenix.prediction.application.PredictionLifecycleCoordinatorFailure
import phoenix.prediction.infrastructure.PredictionLifecycleFailure
import phoenix.prediction.infrastructure.PredictionLifecycleAuditSupport
import phoenix.prediction.infrastructure.PredictionLifecycleRequest
import phoenix.prediction.infrastructure.PredictionProjectionService
import phoenix.prediction.infrastructure.PredictionQueryService
import phoenix.prediction.infrastructure.PredictionReadModelService
import phoenix.prediction.infrastructure.PredictionResolveMarketRequest
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol.BetFinalizationError
import phoenix.auditlog.domain.AuditLogger

final class PredictionBackofficeRoutes(
    basePath: MountPoint,
    predictionReadModels: PredictionQueryService = PredictionReadModelService.noopQuery,
    predictionProjectionService: Option[PredictionProjectionService] = None,
    wallets: Option[WalletsBoundedContext] = None,
    auditLogger: Option[AuditLogger] = None,
    predictionMarketCommandService: Option[PredictionMarketCommandService] = None)(implicit
    auth: JwtAuthenticator,
    ec: ExecutionContext)
    extends Routes {

  private val predictionProjection =
    predictionProjectionService
      .orElse(predictionReadModels match {
        case projection: PredictionProjectionService => Some(projection)
        case _                                       => None
      })
      .getOrElse(PredictionReadModelService.noopProjection)

  private val lifecycleCoordinator =
    new PredictionLifecycleCoordinator(
      predictionReadModels,
      predictionProjection,
      predictionProjection,
      wallets)
  private val lifecycleCommands = predictionMarketCommandService.getOrElse(
    new CoordinatedPredictionMarketCommandService(
      predictionReadModels,
      lifecycleCoordinator,
      auditLogger,
      predictionProjection match {
        case audited: PredictionLifecycleAuditSupport => audited.lifecycleAuditIsTransactional
        case _                                        => false
      }))

  private val getSummary =
    predictionOpsReadEndpoint.get
      .in(basePath / "prediction" / "summary")
      .out(jsonBody[PredictionAdminSummaryResponse])
      .out(statusCode(StatusCode.Ok))

  private val getMarkets =
    predictionOpsReadEndpoint.get
      .in(basePath / "prediction" / "markets")
      .in(query[Option[String]]("category"))
      .in(query[Option[String]]("status"))
      .in(query[Option[Boolean]]("featured"))
      .in(query[Option[Boolean]]("live"))
      .out(jsonBody[PredictionMarketsResponse])
      .out(statusCode(StatusCode.Ok))

  private val getMarket =
    predictionOpsReadEndpoint.get
      .in(basePath / "prediction" / "markets" / path[String]("marketId"))
      .out(jsonBody[PredictionMarketDetailResponse])
      .out(statusCode(StatusCode.Ok))

  private val getMarketLifecycle =
    predictionOpsReadEndpoint.get
      .in(basePath / "prediction" / "markets" / path[String]("marketId") / "lifecycle")
      .out(jsonBody[PredictionLifecycleHistoryResponse])
      .out(statusCode(StatusCode.Ok))

  private val getOrders =
    predictionOpsOrderReadEndpoint.get
      .in(basePath / "prediction" / "orders")
      .in(query[Option[String]]("punterId"))
      .in(query[Option[String]]("marketId"))
      .in(query[Option[String]]("status"))
      .in(query[Option[String]]("category"))
      .out(jsonBody[PredictionOrdersResponse])
      .out(statusCode(StatusCode.Ok))

  private val getOrder =
    predictionOpsOrderReadEndpoint.get
      .in(basePath / "prediction" / "orders" / path[String]("orderId"))
      .out(jsonBody[PredictionOrderView])
      .out(statusCode(StatusCode.Ok))

  private val suspendMarket =
    predictionOpsReversibleStateEndpoint.post
      .in(basePath / "prediction" / "markets" / path[String]("marketId") / "lifecycle" / "suspend")
      .in(jsonBody[PredictionLifecycleRequest])
      .out(jsonBody[PredictionMarketDetailResponse])
      .out(statusCode(StatusCode.Ok))

  private val openMarket =
    predictionOpsReversibleStateEndpoint.post
      .in(basePath / "prediction" / "markets" / path[String]("marketId") / "lifecycle" / "open")
      .in(jsonBody[PredictionLifecycleRequest])
      .out(jsonBody[PredictionMarketDetailResponse])
      .out(statusCode(StatusCode.Ok))

  private val cancelMarket =
    predictionOpsDestructiveOverrideEndpoint.post
      .in(basePath / "prediction" / "markets" / path[String]("marketId") / "lifecycle" / "cancel")
      .in(jsonBody[PredictionLifecycleRequest])
      .out(jsonBody[PredictionMarketDetailResponse])
      .out(statusCode(StatusCode.Ok))

  private val resolveMarket =
    predictionOpsSettlementEndpoint.post
      .in(basePath / "prediction" / "markets" / path[String]("marketId") / "lifecycle" / "resolve")
      .in(jsonBody[PredictionResolveMarketRequest])
      .out(jsonBody[PredictionMarketDetailResponse])
      .out(statusCode(StatusCode.Ok))

  private val resettleMarket =
    predictionOpsSettlementEndpoint.post
      .in(basePath / "prediction" / "markets" / path[String]("marketId") / "lifecycle" / "resettle")
      .in(jsonBody[PredictionResolveMarketRequest])
      .out(jsonBody[PredictionMarketDetailResponse])
      .out(statusCode(StatusCode.Ok))

  private val getSummaryRoute = getSummary.serverLogic { _ => _ =>
    predictionReadModels.adminSummary().map(Right.apply)
  }

  private val getMarketsRoute = getMarkets.serverLogic { _ =>
    {
      case (categoryKey, status, featured, live) =>
        predictionReadModels
          .listMarkets(categoryKey, status, featured, live)
          .map(markets => Right(PredictionMarketsResponse(markets.size, markets)))
    }
  }

  private val getMarketRoute = getMarket.serverLogic { _ => marketId =>
    predictionReadModels
      .marketDetail(marketId)
      .map(
        _.toRight(ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.MarketNotFound)))
  }

  private val getMarketLifecycleRoute = getMarketLifecycle.serverLogic { _ => marketId =>
    predictionReadModels
      .marketLifecycleHistory(marketId)
      .map(
        _.toRight(ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.MarketNotFound)))
  }

  private val getOrdersRoute = getOrders.serverLogic { _ =>
    {
      case (punterId, marketId, status, categoryKey) =>
        predictionReadModels
          .listAllOrders(punterId, status, categoryKey, marketId)
          .map(orders => Right(PredictionOrdersResponse(orders.size, orders)))
    }
  }

  private val getOrderRoute = getOrder.serverLogic { _ => orderId =>
    predictionReadModels
      .findOrder(orderId)
      .map(
        _.toRight(ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.PredictionOrderNotFound)))
  }

  private val suspendMarketRoute = suspendMarket.serverLogic { permissions =>
    {
      case (marketId, request) =>
        lifecycleCommands
          .execute(PredictionMarketCommand.Suspend(marketId, permissions.userId.value, request.reason))
          .map(_.leftMap(predictionCoordinatorFailure))
    }
  }

  private val openMarketRoute = openMarket.serverLogic { permissions =>
    {
      case (marketId, request) =>
        lifecycleCommands
          .execute(PredictionMarketCommand.Reopen(marketId, permissions.userId.value, request.reason))
          .map(_.leftMap(predictionCoordinatorFailure))
    }
  }

  private val cancelMarketRoute = cancelMarket.serverLogic { permissions =>
    {
      case (marketId, request) =>
        lifecycleCommands
          .execute(PredictionMarketCommand.Cancel(marketId, permissions.userId.value, request.reason))
          .map(_.leftMap(predictionCoordinatorFailure))
    }
  }

  private val resolveMarketRoute = resolveMarket.serverLogic { permissions =>
    {
      case (marketId, request) =>
        lifecycleCommands
          .execute(
            PredictionMarketCommand.Resolve(
              marketId,
              request.outcomeId,
              permissions.userId.value,
              request.reason))
          .map(_.leftMap(predictionCoordinatorFailure))
    }
  }

  private val resettleMarketRoute = resettleMarket.serverLogic { permissions =>
    {
      case (marketId, request) =>
        lifecycleCommands
          .execute(
            PredictionMarketCommand.Resettle(
              marketId,
              request.outcomeId,
              permissions.userId.value,
              request.reason))
          .map(_.leftMap(predictionCoordinatorFailure))
    }
  }

  private def predictionLifecycleFailure(error: PredictionLifecycleFailure): (StatusCode, ErrorResponse) =
    error match {
      case PredictionLifecycleFailure.MarketNotFound =>
        ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.MarketNotFound)
      case PredictionLifecycleFailure.OutcomeNotFound =>
        ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.SelectionNotFound)
      case PredictionLifecycleFailure.InvalidTransition =>
        ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PredictionMarketNotOpen)
      case PredictionLifecycleFailure.Unsupported =>
        StatusCode.BadRequest -> ErrorResponse.one(
          StatusCode.BadRequest,
          PresentationError(PresentationErrorCode.PredictionOrderNotCancellable, Some(ErrorDetails("prediction lifecycle controls are unavailable"))))
    }

  private def walletFinalizationFailure(error: BetFinalizationError): (StatusCode, ErrorResponse) =
    error match {
      case _ => ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PredictionOrderNotCancellable)
    }

  private def predictionCoordinatorFailure(
      error: PredictionLifecycleCoordinatorFailure): (StatusCode, ErrorResponse) =
    error match {
      case PredictionLifecycleCoordinatorFailure.Lifecycle(lifecycleError) =>
        predictionLifecycleFailure(lifecycleError)
      case PredictionLifecycleCoordinatorFailure.Wallet(walletError) =>
        walletFinalizationFailure(walletError)
      case PredictionLifecycleCoordinatorFailure.WalletsUnavailable =>
        predictionLifecycleFailure(PredictionLifecycleFailure.Unsupported)
    }

  override val endpoints: Routes.Endpoints =
    List(
      getSummaryRoute,
      getMarketsRoute,
      getMarketRoute,
      getMarketLifecycleRoute,
      getOrdersRoute,
      getOrderRoute,
      suspendMarketRoute,
      openMarketRoute,
      cancelMarketRoute,
      resolveMarketRoute,
      resettleMarketRoute)
}
