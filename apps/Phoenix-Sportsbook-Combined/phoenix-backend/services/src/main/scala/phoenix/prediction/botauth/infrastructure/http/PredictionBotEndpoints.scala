package phoenix.prediction.botauth.infrastructure.http

import scala.concurrent.ExecutionContext

import io.circe.generic.auto._
import sttp.model.StatusCode
import sttp.tapir._
import sttp.tapir.generic.auto._

import phoenix.http.core.TapirAuthDirectives.adminEndpoint
import phoenix.http.routes.HttpBody.jsonBody
import phoenix.jwt.JwtAuthenticator

object PredictionBotEndpoints {

  final case class IssueBotApiKeyRequest(
      accountKey: String,
      displayName: String,
      scopes: Set[String],
      expiresAt: Option[String])

  final case class IssuedBotApiKeyResponse(
      accountId: String,
      keyId: String,
      token: String,
      issuedAt: String)

  def issueBotApiKeyEndpoint(implicit auth: JwtAuthenticator, ec: ExecutionContext) =
    adminEndpoint.post
      .in("v1" / "bot" / "keys")
      .in(jsonBody[IssueBotApiKeyRequest])
      .out(jsonBody[IssuedBotApiKeyResponse])
      .out(statusCode(StatusCode.Created))
}
