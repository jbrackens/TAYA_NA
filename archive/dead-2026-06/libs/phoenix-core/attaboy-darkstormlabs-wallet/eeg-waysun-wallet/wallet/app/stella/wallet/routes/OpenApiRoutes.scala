package stella.wallet.routes

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import play.api.routing.Router.Routes
import sttp.tapir.openapi.Server
import sttp.tapir.server.play.PlayServerInterpreter
import sttp.tapir.swagger.SwaggerUIOptions
import sttp.tapir.swagger.bundle.SwaggerInterpreter

import stella.common.http.config.OpenApiConfig
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.StellaAuthContext

import stella.wallet.routes.currency.CurrencyEndpoints
import stella.wallet.routes.transaction.TransactionHistoryEndpoints
import stella.wallet.routes.wallet.WalletEndpoints

class OpenApiRoutes(serverInterpreter: PlayServerInterpreter, openApiConfig: OpenApiConfig)(implicit
    jwtAuthorization: JwtAuthorization[StellaAuthContext],
    ec: ExecutionContext) {

  lazy val openApi: Routes =
    serverInterpreter.toRoutes(
      SwaggerInterpreter(
        customiseDocsModel = _.servers(List(Server(openApiConfig.serverUrl))),
        swaggerUIOptions = SwaggerUIOptions.default.pathPrefix(List(OpenApiRoutes.openApiDocsPath)))
        .fromEndpoints[Future](
          endpoints =
            (CurrencyEndpoints.swaggerDefinition ++ WalletEndpoints.swaggerDefinition ++ TransactionHistoryEndpoints.swaggerDefinition).endpoints,
          title = "Stella Wallet",
          version = "0.9"))
}

object OpenApiRoutes {
  private val openApiDocsPath = "wallet_docs"
}
