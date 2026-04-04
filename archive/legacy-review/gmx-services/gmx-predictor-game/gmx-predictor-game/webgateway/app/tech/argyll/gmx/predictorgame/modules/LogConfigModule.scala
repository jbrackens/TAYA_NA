package tech.argyll.gmx.predictorgame.modules

import com.google.inject.AbstractModule
import com.typesafe.config.ConfigFactory
import play.api.Logger

class LogConfigModule extends AbstractModule {

  override def configure() = {
    Logger.logger.warn("System.getProperties")
    System.getProperties.entrySet().forEach(e => Logger.logger.warn(s"${e.getKey} => ${e.getValue}"))

    Logger.logger.warn("System.getenv")
    System.getenv().entrySet().forEach(e => Logger.logger.warn(s"${e.getKey} => ${e.getValue}"))

    Logger.logger.warn("ConfigFactory.load")
    ConfigFactory.load().entrySet().forEach(e => Logger.logger.warn(s"${e.getKey} => ${e.getValue}"))
  }

}
