package stella.rules.routes

import play.api.routing.Router.Routes
import play.api.routing.SimpleRouter

import stella.rules.routes.achievement.AchievementRuleConfigurationRoutes
import stella.rules.routes.aggregation.AggregationRuleConfigurationRoutes
import stella.rules.routes.event.EventConfigurationRoutes

class ApiRouter(
    eventConfigurationRoutes: EventConfigurationRoutes,
    aggregationRuleConfigurationRoutes: AggregationRuleConfigurationRoutes,
    achievementRuleConfigurationRoutes: AchievementRuleConfigurationRoutes,
    openApiRoutes: OpenApiRoutes)
    extends SimpleRouter {

  override def routes: Routes = eventConfigurationRoutes.eventRoutes
    .orElse(aggregationRuleConfigurationRoutes.aggregationRuleRoutes)
    .orElse(achievementRuleConfigurationRoutes.achievementRuleRoutes)
    .orElse(openApiRoutes.openApi)
}
