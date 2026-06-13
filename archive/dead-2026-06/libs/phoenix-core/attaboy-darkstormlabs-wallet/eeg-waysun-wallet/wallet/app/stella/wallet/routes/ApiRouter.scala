package stella.wallet.routes

import play.api.routing.Router.Routes
import play.api.routing.SimpleRouter

import stella.wallet.routes.currency.CurrencyRoutes
import stella.wallet.routes.transaction.TransactionHistoryRoutes
import stella.wallet.routes.wallet.WalletRoutes

class ApiRouter(
    currencyRoutes: CurrencyRoutes,
    walletRoutes: WalletRoutes,
    transactionRoutes: TransactionHistoryRoutes,
    openApiRoutes: OpenApiRoutes)
    extends SimpleRouter {

  override def routes: Routes =
    currencyRoutes.routes.orElse(walletRoutes.routes).orElse(transactionRoutes.routes).orElse(openApiRoutes.openApi)
}
