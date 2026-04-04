package gmx.widget.siteextentions.datafeed

import akka.actor.typed.ActorSystem
import akka.actor.typed.Behavior
import akka.actor.typed.scaladsl.Behaviors
import com.typesafe.config.ConfigFactory
import com.typesafe.scalalogging.LazyLogging

import gmx.widget.siteextentions.datafeed.module.DataModule
import gmx.widget.siteextentions.datafeed.module.PersistenceModule

object LocalApplication extends Application {

  def apply(args: Array[String]): Unit = {
    require(args.length == 0)
    startup()
  }

  private def startup(): Unit = {
    val config = ConfigFactory.load()

    ActorSystem[Nothing](RootBehavior(), Application.applicationName, config)
  }

}

trait Application {

  object RootBehavior {
    def apply(): Behavior[Nothing] =
      Behaviors.setup[Nothing] { context =>
        implicit val system: ActorSystem[_] = context.system

        val persistenceModule = PersistenceModule(system.settings.config)
        new DataModule(persistenceModule)(system.settings.config, system)

        Behaviors.empty[Nothing]
      }
  }

}

object Application extends LazyLogging {
  val applicationName = "DataFeed"

  def run(args: Array[String]): Unit = {
    logger.info(s"${Application.applicationName} Startup...")

    LocalApplication(args)
  }

}
