package net.flipsports.gmx.common.internal.scala.play.app

import play.api.{ Environment, LoggerConfigurator }

trait ApplicationLoggerHelper {

  protected def loadCustomLoggerConfiguration(environment: Environment) = {
    LoggerConfigurator(environment.classLoader).foreach {
      _.configure(environment)
    }
  }
}
