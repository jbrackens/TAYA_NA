package stella.rules

import com.softwaremill.macwire.wire
import play.api.ApplicationLoader.Context
import play.api._
import play.api.mvc.EssentialFilter
import play.api.routing.Router
import play.filters.HttpFiltersComponents
import play.filters.cors.CORSComponents
import play.filters.csrf.CSRFFilter
import play.filters.headers.SecurityHeadersFilter
import router.Routes

class RuleConfiguratorApplicationLoader extends ApplicationLoader {
  override def load(context: Context): Application = new RuleConfiguratorComponents(context).application
}

class RuleConfiguratorComponents(context: Context)
    extends BuiltInComponentsFromContext(context)
    with RuleConfiguratorModule
    with HttpFiltersComponents
    with CORSComponents {

  private val filtersToDisable = List(classOf[CSRFFilter], classOf[SecurityHeadersFilter])

  // set up logger
  LoggerConfigurator(context.environment.classLoader).foreach {
    _.configure(context.environment, context.initialConfiguration, Map.empty)
  }

  override lazy val router: Router = {
    // add the prefix string in local scope for the Routes constructor
    val prefix: String = "/"
    wire[Routes]
  }

  override def httpFilters: Seq[EssentialFilter] = {
    super.httpFilters.filterNot(httpFilter => filtersToDisable.contains(httpFilter.getClass)).appended(corsFilter)
  }
}
