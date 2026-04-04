package stella.achievement.routes

import play.api.routing.Router.Routes
import play.api.routing.SimpleRouter

class ApiRouter(achievementRoutes: AchievementRoutes, openApiRoutes: OpenApiRoutes) extends SimpleRouter {

  override def routes: Routes = achievementRoutes.achievementDataRoutes.orElse(openApiRoutes.openApi)
}
