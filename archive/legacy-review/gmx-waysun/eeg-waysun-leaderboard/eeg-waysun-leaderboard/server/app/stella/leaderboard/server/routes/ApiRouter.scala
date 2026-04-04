package stella.leaderboard.server.routes

import play.api.routing.Router.Routes
import play.api.routing.SimpleRouter

class ApiRouter(leaderboardRoutes: LeaderboardRoutes, openApiRoutes: OpenApiRoutes) extends SimpleRouter {

  override def routes: Routes = leaderboardRoutes.leaderboardDataRoutes.orElse(openApiRoutes.openApi)
}
