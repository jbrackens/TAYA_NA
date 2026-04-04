package stella.usercontext.routes

import play.api.routing.Router.Routes
import play.api.routing.SimpleRouter

class ApiRouter(userContextRoutes: UserContextRoutes, openApiRoutes: OpenApiRoutes) extends SimpleRouter {

  override def routes: Routes = userContextRoutes.userContextRoutes.orElse(openApiRoutes.openApi)
}
