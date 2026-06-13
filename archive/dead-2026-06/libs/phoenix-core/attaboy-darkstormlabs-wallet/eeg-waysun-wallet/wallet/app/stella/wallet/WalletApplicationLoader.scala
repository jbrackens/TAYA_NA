package stella.wallet

import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.adapter._
import akka.management.cluster.bootstrap.ClusterBootstrap
import akka.management.scaladsl.AkkaManagement
import com.softwaremill.macwire.wire
import play.api.ApplicationLoader.Context
import play.api._
import play.api.cluster.sharding.typed.ClusterShardingComponents
import play.api.mvc.EssentialFilter
import play.api.routing.Router
import play.filters.HttpFiltersComponents
import play.filters.cors.CORSComponents
import play.filters.csrf.CSRFFilter
import play.filters.headers.SecurityHeadersFilter
import router.Routes

class WalletApplicationLoader extends ApplicationLoader {
  override def load(context: Context): Application = {
    new WalletComponents(context).application
  }
}

class WalletComponents(context: Context)
    extends BuiltInComponentsFromContext(context)
    with WalletModule
    with HttpFiltersComponents
    with ClusterShardingComponents
    with CORSComponents {

  override lazy val typedActorSystem: ActorSystem[_] = actorSystem.toTyped
  private val filtersToDisable = List(classOf[CSRFFilter], classOf[SecurityHeadersFilter])

  // set up logger
  LoggerConfigurator(context.environment.classLoader).foreach {
    _.configure(context.environment, context.initialConfiguration, Map.empty)
  }

  if (config.walletAkka.startAkkaManagementAndClusterBootstrap) startServicesForKubernetes()

  override lazy val router: Router = {
    // add the prefix string in local scope for the Routes constructor
    val prefix: String = "/"
    wire[Routes]
  }

  override def httpFilters: Seq[EssentialFilter] = {
    super.httpFilters.filterNot(httpFilter => filtersToDisable.contains(httpFilter.getClass)).appended(corsFilter)
  }

  private def startServicesForKubernetes(): Unit = {
    AkkaManagement(actorSystem).start()
    ClusterBootstrap(actorSystem).start()
  }
}
