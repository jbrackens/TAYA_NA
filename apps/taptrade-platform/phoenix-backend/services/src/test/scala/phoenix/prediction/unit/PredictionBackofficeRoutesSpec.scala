package phoenix.prediction.unit

import scala.concurrent.Future

import akka.http.scaladsl.model.StatusCodes
import io.circe.Json

import phoenix.auditlog.domain.AuditLogger
import phoenix.auditlog.domain.PredictionMarketLifecycleEntry
import phoenix.auditlog.support.InMemoryAuditLogRepository
import phoenix.http.JsonMarshalling._
import phoenix.http.routes.RoutesSpecSupport
import phoenix.http.routes.backoffice.BackofficeRoutes
import phoenix.jwt.JwtAuthenticatorMock
import phoenix.jwt.Permissions.UserId
import phoenix.jwt.Permissions.Username
import phoenix.prediction.infrastructure.PredictionLifecycleFailure
import phoenix.prediction.infrastructure.PredictionLifecycleAuditSupport
import phoenix.prediction.infrastructure.PredictionProjectionService
import phoenix.prediction.infrastructure.PredictionReadModelService
import phoenix.prediction.infrastructure.http.PredictionBackofficeRoutes
import phoenix.prediction.infrastructure.http.PredictionCatalog
import phoenix.prediction.infrastructure.http.PredictionMarketDetailResponse
import phoenix.prediction.infrastructure.http.PredictionOrderFailure
import phoenix.prediction.infrastructure.http.PredictionOrderStore
import phoenix.prediction.infrastructure.http.PredictionOrderView
import phoenix.prediction.infrastructure.http.PredictionPlaceOrderRequest
import phoenix.time.FakeHardcodedClock
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId

final class PredictionBackofficeRoutesSpec extends RoutesSpecSupport {

  private val clock = new FakeHardcodedClock()
  private val auditLogRepository = new InMemoryAuditLogRepository()
  private val auditLogger = new AuditLogger(auditLogRepository, clock)
  private val authenticatedUserId = UserId("prediction-ops-user")
  private val authenticatedUsername = Username("prediction-ops")
  private val jwtAuthenticator = JwtAuthenticatorMock.jwtAuthenticatorMock(authenticatedUserId, authenticatedUsername)

  private def routes =
    new PredictionBackofficeRoutes(
      basePath = BackofficeRoutes.adminMountPoint,
      predictionReadModels = PredictionReadModelService.noop)(
      jwtAuthenticator,
      system.dispatcher).toAkkaHttp

  private def successfulSuspendRoutes = {
    val queryService = PredictionReadModelService.noopQuery
    val projectionService = suspendProjectionService(transactionalAudit = false)

    new PredictionBackofficeRoutes(
      basePath = BackofficeRoutes.adminMountPoint,
      predictionReadModels = queryService,
      predictionProjectionService = Some(projectionService),
      auditLogger = Some(auditLogger))(
      jwtAuthenticator,
      system.dispatcher).toAkkaHttp
  }

  private def transactionalSuspendRoutes = {
    val queryService = PredictionReadModelService.noopQuery
    val projectionService = suspendProjectionService(transactionalAudit = true)

    new PredictionBackofficeRoutes(
      basePath = BackofficeRoutes.adminMountPoint,
      predictionReadModels = queryService,
      predictionProjectionService = Some(projectionService),
      auditLogger = Some(auditLogger))(
      jwtAuthenticator,
      system.dispatcher).toAkkaHttp
  }

  private def suspendProjectionService(transactionalAudit: Boolean) =
    new PredictionProjectionService with PredictionLifecycleAuditSupport {
      private val delegate = PredictionReadModelService.noopProjection

      override val lifecycleAuditIsTransactional: Boolean = transactionalAudit

      override def syncSeedData()(implicit ec: scala.concurrent.ExecutionContext): Future[Unit] =
        delegate.syncSeedData()

      override def prepareOrder(
          punterId: String,
          request: PredictionPlaceOrderRequest)(implicit
          ec: scala.concurrent.ExecutionContext): Future[Either[PredictionOrderFailure, PredictionOrderStore.PreparedPredictionOrder]] =
        delegate.prepareOrder(punterId, request)

      override def placePreparedOrder(
          prepared: PredictionOrderStore.PreparedPredictionOrder,
          reservationId: ReservationId)(implicit
          ec: scala.concurrent.ExecutionContext): Future[PredictionOrderView] =
        delegate.placePreparedOrder(prepared, reservationId)

      override def findOpenOwnedOrder(
          punterId: String,
          orderId: String)(implicit
          ec: scala.concurrent.ExecutionContext): Future[Either[PredictionOrderFailure, PredictionOrderStore.OpenPredictionOrder]] =
        delegate.findOpenOwnedOrder(punterId, orderId)

      override def listOpenOrdersForMarket(marketId: String)(implicit
          ec: scala.concurrent.ExecutionContext): Future[Seq[PredictionOrderStore.OpenPredictionOrder]] =
        delegate.listOpenOrdersForMarket(marketId)

      override def listSettledOrdersForMarket(marketId: String)(implicit
          ec: scala.concurrent.ExecutionContext): Future[Seq[PredictionOrderStore.SettledPredictionOrder]] =
        delegate.listSettledOrdersForMarket(marketId)

      override def cancelStoredOrder(orderId: String, reason: Option[String])(implicit
          ec: scala.concurrent.ExecutionContext): Future[PredictionOrderView] =
        delegate.cancelStoredOrder(orderId, reason)

      override def settleStoredOrder(orderId: String, status: String, reason: Option[String], performedBy: Option[String])(implicit
          ec: scala.concurrent.ExecutionContext): Future[PredictionOrderView] =
        delegate.settleStoredOrder(orderId, status, reason, performedBy)

      override def suspendMarket(marketId: String, performedBy: String, reason: String)(implicit
          ec: scala.concurrent.ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]] =
        PredictionCatalog.marketDetail(marketId) match {
          case None => Future.successful(Left(PredictionLifecycleFailure.MarketNotFound))
          case Some(detail) =>
            val updatedDetail = detail.copy(market = detail.market.copy(status = "suspended", live = false))
            if (transactionalAudit) {
              auditLogger
                .recordPredictionMarketLifecycle(
                  action = "prediction.market.suspended",
                  actorId = performedBy,
                  targetId = marketId,
                  details = reason,
                  dataBefore = Map(
                    "marketId" -> detail.market.marketId,
                    "marketTitle" -> detail.market.shortTitle,
                    "status" -> detail.market.status,
                    "live" -> detail.market.live.toString,
                    "featured" -> detail.market.featured.toString),
                  dataAfter = Map(
                    "marketId" -> updatedDetail.market.marketId,
                    "marketTitle" -> updatedDetail.market.shortTitle,
                    "status" -> updatedDetail.market.status,
                    "live" -> updatedDetail.market.live.toString,
                    "featured" -> updatedDetail.market.featured.toString))
                .map(_ => Right(updatedDetail))
            } else {
              Future.successful(Right(updatedDetail))
            }
        }

      override def openMarket(marketId: String, performedBy: String, reason: String)(implicit
          ec: scala.concurrent.ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]] =
        delegate.openMarket(marketId, performedBy, reason)

      override def resolveMarket(
          marketId: String,
          outcomeId: String,
          performedBy: String,
          reason: String)(implicit
          ec: scala.concurrent.ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]] =
        delegate.resolveMarket(marketId, outcomeId, performedBy, reason)

      override def resettleMarket(
          marketId: String,
          outcomeId: String,
          performedBy: String,
          reason: String)(implicit
          ec: scala.concurrent.ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]] =
        delegate.resettleMarket(marketId, outcomeId, performedBy, reason)

      override def cancelMarket(marketId: String, performedBy: String, reason: String)(implicit
          ec: scala.concurrent.ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]] =
        delegate.cancelMarket(marketId, performedBy, reason)
    }

  "Prediction backoffice routes" when {
    "GET /admin/prediction/summary" should {
      "return 401 Unauthorized for missing auth token" in {
        Get("/admin/prediction/summary") ~> routes ~> check {
          status shouldBe StatusCodes.Unauthorized
        }
      }

      "return 403 Forbidden for punter role" in {
        withAuthToken(Get("/admin/prediction/summary"), JwtAuthenticatorMock.punterToken) ~> routes ~> check {
          status shouldBe StatusCodes.Forbidden
          assertErrorResponse(responseAs[Json], "userMissingPredictionOpsRole")
        }
      }

      "return 200 OK for trader role" in {
        withAuthToken(Get("/admin/prediction/summary"), JwtAuthenticatorMock.traderToken) ~> routes ~> check {
          status shouldBe StatusCodes.OK
        }
      }

      "return 200 OK for operator role" in {
        withAuthToken(Get("/admin/prediction/summary"), JwtAuthenticatorMock.operatorToken) ~> routes ~> check {
          status shouldBe StatusCodes.OK
        }
      }

      "return 200 OK for admin role" in {
        withAdminToken(Get("/admin/prediction/summary")) ~> routes ~> check {
          status shouldBe StatusCodes.OK
        }
      }
    }

    "GET /admin/prediction/orders" should {
      "return 403 Forbidden for operator role" in {
        withAuthToken(Get("/admin/prediction/orders"), JwtAuthenticatorMock.operatorToken) ~> routes ~> check {
          status shouldBe StatusCodes.Forbidden
          assertErrorResponse(responseAs[Json], "userMissingPredictionOpsRole")
        }
      }

      "return 200 OK for trader role" in {
        withAuthToken(Get("/admin/prediction/orders"), JwtAuthenticatorMock.traderToken) ~> routes ~> check {
          status shouldBe StatusCodes.OK
        }
      }
    }

    "POST /admin/prediction/markets/{marketId}/lifecycle/suspend" should {
      val requestBody = Json.obj("reason" -> Json.fromString("operator review"))

      "return 400 Bad Request for trader role because auth succeeds and noop lifecycle support is unavailable" in {
        withAuthToken(
          Post("/admin/prediction/markets/pm-btc-120k-2026/lifecycle/suspend", requestBody),
          JwtAuthenticatorMock.traderToken) ~> routes ~> check {
          status shouldBe StatusCodes.BadRequest
          assertErrorResponse(responseAs[Json], "predictionOrderNotCancellable")
        }
      }

      "return 403 Forbidden for operator role" in {
        withAuthToken(
          Post("/admin/prediction/markets/pm-btc-120k-2026/lifecycle/suspend", requestBody),
          JwtAuthenticatorMock.operatorToken) ~> routes ~> check {
          status shouldBe StatusCodes.Forbidden
          assertErrorResponse(responseAs[Json], "userMissingPredictionOpsRole")
        }
      }

      "record a backend audit entry after a successful lifecycle change" in {
        auditLogRepository.entries = List.empty
        withAuthToken(
          Post("/admin/prediction/markets/pm-btc-120k-2026/lifecycle/suspend", requestBody),
          JwtAuthenticatorMock.traderToken) ~> successfulSuspendRoutes ~> check {
          status shouldBe StatusCodes.OK
          val entry = auditLogRepository.entries.last.asInstanceOf[PredictionMarketLifecycleEntry]
          entry.action shouldBe "prediction.market.suspended"
          entry.actorId shouldBe authenticatedUserId.value
          entry.targetId shouldBe "pm-btc-120k-2026"
          entry.product shouldBe "prediction"
          entry.details shouldBe "operator review"
          entry.dataBefore("status") shouldBe "live"
          entry.dataAfter("status") shouldBe "suspended"
        }
      }

      "avoid duplicate backend audit entries when lifecycle persistence is transactional" in {
        auditLogRepository.entries = List.empty
        withAuthToken(
          Post("/admin/prediction/markets/pm-btc-120k-2026/lifecycle/suspend", requestBody),
          JwtAuthenticatorMock.traderToken) ~> transactionalSuspendRoutes ~> check {
          status shouldBe StatusCodes.OK
          auditLogRepository.entries.size shouldBe 1
          val entry = auditLogRepository.entries.last.asInstanceOf[PredictionMarketLifecycleEntry]
          entry.action shouldBe "prediction.market.suspended"
          entry.targetId shouldBe "pm-btc-120k-2026"
        }
      }
    }

    "POST /admin/prediction/markets/{marketId}/lifecycle/resettle" should {
      val requestBody = Json.obj(
        "reason" -> Json.fromString("settlement correction"),
        "outcomeId" -> Json.fromString("yes"))

      "return 403 Forbidden for trader role" in {
        withAuthToken(
          Post("/admin/prediction/markets/pm-btc-120k-2026/lifecycle/resettle", requestBody),
          JwtAuthenticatorMock.traderToken) ~> routes ~> check {
          status shouldBe StatusCodes.Forbidden
          assertErrorResponse(responseAs[Json], "userMissingAdminRole")
        }
      }
    }

    "POST /admin/prediction/markets/{marketId}/lifecycle/cancel" should {
      val requestBody = Json.obj("reason" -> Json.fromString("operator cancel"))

      "return 403 Forbidden for trader role" in {
        withAuthToken(
          Post("/admin/prediction/markets/pm-btc-120k-2026/lifecycle/cancel", requestBody),
          JwtAuthenticatorMock.traderToken) ~> routes ~> check {
          status shouldBe StatusCodes.Forbidden
          assertErrorResponse(responseAs[Json], "userMissingAdminRole")
        }
      }
    }
  }
}
