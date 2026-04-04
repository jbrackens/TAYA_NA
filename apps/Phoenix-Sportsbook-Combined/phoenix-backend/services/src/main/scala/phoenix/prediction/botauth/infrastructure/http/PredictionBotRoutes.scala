package phoenix.prediction.botauth.infrastructure.http

import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import io.circe.generic.auto._

import phoenix.http.core.Routes
import phoenix.jwt.JwtAuthenticator
import phoenix.prediction.botauth.infrastructure.http.PredictionBotEndpoints.IssuedBotApiKeyResponse
import phoenix.prediction.botauth.infrastructure.http.PredictionBotEndpoints.issueBotApiKeyEndpoint

final class PredictionBotRoutes()(implicit auth: JwtAuthenticator, ec: ExecutionContext) extends Routes {

  private val issueBotApiKeyRoute = issueBotApiKeyEndpoint.serverLogic { _ => request =>
    val issuedAt = OffsetDateTime.now(ZoneOffset.UTC).toString
    val keyId = UUID.randomUUID().toString
    val token = s"phoenix_bot_${UUID.randomUUID().toString.replace("-", "")}"

    Future.successful(
      Right(
        IssuedBotApiKeyResponse(
          accountId = request.accountKey,
          keyId = keyId,
          token = token,
          issuedAt = issuedAt)))
  }

  override val endpoints: Routes.Endpoints = List(issueBotApiKeyRoute)
}
