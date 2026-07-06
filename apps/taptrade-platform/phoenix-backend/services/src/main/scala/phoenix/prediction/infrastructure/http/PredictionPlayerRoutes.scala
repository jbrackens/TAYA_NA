package phoenix.prediction.infrastructure.http

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.syntax.either._
import io.circe.generic.auto._
import sttp.model.StatusCode
import sttp.tapir._
import sttp.tapir.generic.auto._

import phoenix.core.error.ErrorDetails
import phoenix.core.error.ErrorResponse
import phoenix.core.error.PresentationError
import phoenix.core.error.PresentationErrorCode
import phoenix.http.core.Routes
import phoenix.http.core.TapirAuthDirectives._
import phoenix.http.routes.HttpBody.jsonBody
import phoenix.jwt.JwtAuthenticator
import phoenix.prediction.application.PredictionPlayerOrdersFailure
import phoenix.prediction.application.PredictionPlayerOrdersService
import phoenix.prediction.application.ReadModelBackedPredictionPlayerOrdersService
import phoenix.prediction.infrastructure.PredictionProjectionService
import phoenix.prediction.infrastructure.PredictionQueryService
import phoenix.prediction.infrastructure.PredictionReadModelService
import phoenix.punters.PuntersBoundedContext
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol.BetFinalizationError
import phoenix.wallets.WalletsBoundedContextProtocol.InsufficientFundsError
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationError
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationNotFoundError
import phoenix.wallets.WalletsBoundedContextProtocol.WalletNotFoundError

final case class PredictionApiError(error: String)

final class PredictionPlayerRoutes(
    punters: PuntersBoundedContext,
    wallets: WalletsBoundedContext,
    predictionReadModels: PredictionQueryService = PredictionReadModelService.noopQuery,
    predictionProjectionService: Option[PredictionProjectionService] = None,
    predictionOrdersService: Option[PredictionPlayerOrdersService] = None)(implicit
    auth: JwtAuthenticator,
    ec: ExecutionContext)
    extends Routes {

  private val errorOut = statusCode.and(jsonBody[PredictionApiError])
  private val predictionProjection =
    predictionProjectionService
      .orElse(predictionReadModels match {
        case projection: PredictionProjectionService => Some(projection)
        case _                                       => None
      })
      .getOrElse(PredictionReadModelService.noopProjection)
  private val orderCommands =
    predictionOrdersService.getOrElse(
      new ReadModelBackedPredictionPlayerOrdersService(predictionProjection, wallets))

  private val overviewEndpoint =
    endpoint.get
      .in("api" / "v1" / "prediction" / "overview")
      .out(jsonBody[PredictionOverviewView])
      .out(statusCode(StatusCode.Ok))

  private val categoriesEndpoint =
    endpoint.get
      .in("api" / "v1" / "prediction" / "categories")
      .out(jsonBody[Map[String, Seq[PredictionCategoryView]]])
      .out(statusCode(StatusCode.Ok))

  private val listMarketsEndpoint =
    endpoint.get
      .in("api" / "v1" / "prediction" / "markets")
      .in(query[Option[String]]("category"))
      .in(query[Option[String]]("status"))
      .in(query[Option[Boolean]]("featured"))
      .in(query[Option[Boolean]]("live"))
      .out(jsonBody[PredictionMarketsResponse])
      .out(statusCode(StatusCode.Ok))

  private val marketDetailEndpoint =
    endpoint.get
      .in("api" / "v1" / "prediction" / "markets" / path[String]("marketId"))
      .errorOut(errorOut)
      .out(jsonBody[PredictionMarketDetailResponse])
      .out(statusCode(StatusCode.Ok))

  private val previewTicketEndpoint =
    endpoint.post
      .in("api" / "v1" / "prediction" / "ticket" / "preview")
      .in(jsonBody[PredictionTicketPreviewRequest])
      .errorOut(errorOut)
      .out(jsonBody[PredictionTicketPreviewResponse])
      .out(statusCode(StatusCode.Ok))

  private val listOrdersEndpoint =
    allowActivePunterEndpointJwt(punters).get
      .in("api" / "v1" / "prediction" / "orders")
      .in(query[Option[String]]("status"))
      .in(query[Option[String]]("category"))
      .out(jsonBody[PredictionOrdersResponse])
      .out(statusCode(StatusCode.Ok))

  private val placeOrderEndpoint =
    allowActivePunterEndpointJwt(punters).post
      .in("api" / "v1" / "prediction" / "orders")
      .in(jsonBody[PredictionPlaceOrderRequest])
      .out(jsonBody[PredictionPlaceOrderResponse])
      .out(statusCode(StatusCode.Ok))

  private val cancelOrderEndpoint =
    allowActivePunterEndpointJwt(punters).post
      .in("api" / "v1" / "prediction" / "orders" / path[String]("orderId") / "cancel")
      .out(jsonBody[PredictionCancelOrderResponse])
      .out(statusCode(StatusCode.Ok))

  private val overviewRoute = overviewEndpoint.serverLogicSuccess { _ =>
    predictionReadModels.overview()
  }

  private val categoriesRoute = categoriesEndpoint.serverLogicSuccess { _ =>
    Future.successful(Map("categories" -> predictionReadModels.categories))
  }

  private val listMarketsRoute = listMarketsEndpoint.serverLogicSuccess {
    case (categoryKey, status, featured, live) =>
      predictionReadModels
        .listMarkets(categoryKey, status, featured, live)
        .map(markets => PredictionMarketsResponse(markets.size, markets))
  }

  private val marketDetailRoute = marketDetailEndpoint.serverLogic { marketId =>
    predictionReadModels
      .marketDetail(marketId)
      .map(_.toRight((StatusCode.NotFound, PredictionApiError("Prediction market not found"))))
  }

  private val previewTicketRoute = previewTicketEndpoint.serverLogic { request =>
    predictionReadModels
      .preview(request)
      .map(
        _.leftMap(error =>
          if (error == "Stake must be greater than zero") {
            (StatusCode.BadRequest, PredictionApiError(error))
          } else {
            (StatusCode.NotFound, PredictionApiError(error))
          }))
  }

  private val listOrdersRoute = listOrdersEndpoint.serverLogic { punterId =>
    {
      case (status, categoryKey) =>
        predictionReadModels
          .listOrdersForPunter(punterId.value, status, categoryKey)
          .map(orders => Right(PredictionOrdersResponse(orders.size, orders)))
    }
  }

  private val placeOrderRoute = placeOrderEndpoint.serverLogic { punterId => request =>
    orderCommands
      .placeOrder(punterId, request)
      .map(_.leftMap(predictionPlayerOrdersFailure).map(PredictionPlaceOrderResponse.apply))
  }

  private val cancelOrderRoute = cancelOrderEndpoint.serverLogic { punterId => orderId =>
    orderCommands
      .cancelOrder(punterId, orderId)
      .map(_.leftMap(predictionPlayerOrdersFailure).map(PredictionCancelOrderResponse.apply))
  }

  private def predictionOrderFailure(error: PredictionOrderFailure) =
    error match {
      case PredictionOrderFailure.MarketNotFound =>
        ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.MarketNotFound)
      case PredictionOrderFailure.OutcomeNotFound =>
        ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.SelectionNotFound)
      case PredictionOrderFailure.InvalidStake =>
        ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PredictionStakeInvalid)
      case PredictionOrderFailure.MarketNotOpen =>
        ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PredictionMarketNotOpen)
      case PredictionOrderFailure.OrderNotFound =>
        ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.PredictionOrderNotFound)
      case PredictionOrderFailure.OrderNotCancellable =>
        ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PredictionOrderNotCancellable)
    }

  private def walletReservationFailure(error: ReservationError) =
    error match {
      case _: WalletNotFoundError =>
        ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.WalletNotFound)
      case _: InsufficientFundsError =>
        ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.InsufficientFunds)
      case _ =>
        ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PredictionStakeInvalid)
    }

  private def walletFinalizationFailure(error: BetFinalizationError) =
    error match {
      case _: WalletNotFoundError =>
        ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.WalletNotFound)
      case _: ReservationNotFoundError =>
        ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.ReservationNotFound)
      case _ =>
        ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PredictionOrderNotCancellable)
    }

  private def predictionPersistenceFailure(throwable: Throwable) =
    StatusCode.InternalServerError -> ErrorResponse.one(
      StatusCode.InternalServerError,
      PresentationError(
        PresentationErrorCode.InternalError,
        Some(ErrorDetails(Option(throwable.getMessage).getOrElse("unable to persist prediction order")))))

  private def predictionPlayerOrdersFailure(error: PredictionPlayerOrdersFailure) =
    error match {
      case PredictionPlayerOrdersFailure.Order(orderError) =>
        predictionOrderFailure(orderError)
      case PredictionPlayerOrdersFailure.Reservation(reservationError) =>
        walletReservationFailure(reservationError)
      case PredictionPlayerOrdersFailure.Finalization(finalizationError) =>
        walletFinalizationFailure(finalizationError)
      case PredictionPlayerOrdersFailure.Persistence(throwable) =>
        predictionPersistenceFailure(throwable)
    }

  override val endpoints: Routes.Endpoints =
    List(
      overviewRoute,
      categoriesRoute,
      listMarketsRoute,
      marketDetailRoute,
      previewTicketRoute,
      listOrdersRoute,
      placeOrderRoute,
      cancelOrderRoute)
}
