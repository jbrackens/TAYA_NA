package stella.leaderboard.server

import com.softwaremill.macwire.wire
import play.api.ApplicationLoader.Context
import play.api._
import play.api.cache.redis.CacheAsyncApi
import play.api.cache.redis.RedisCacheComponents
import play.api.mvc.EssentialFilter
import play.api.routing.Router
import play.filters.HttpFiltersComponents
import play.filters.cors.CORSComponents
import play.filters.csrf.CSRFFilter
import play.filters.headers.SecurityHeadersFilter
import router.Routes

class LeaderboardApplicationLoader extends ApplicationLoader {
  override def load(context: Context): Application = new LeaderboardComponents(context).application
}

class LeaderboardComponents(context: Context)
    extends BuiltInComponentsFromContext(context)
    with LeaderboardModule
    with HttpFiltersComponents
    with RedisCacheComponents
    with CORSComponents {

  private val filtersToDisable = List(classOf[CSRFFilter], classOf[SecurityHeadersFilter])

  override lazy val cache: CacheAsyncApi = cacheApi("play").async

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
