package net.flipsports.gmx.streaming.internal.notifications.job

import net.flipsports.gmx.streaming.common.job.DefaultExecutionEnvironment
import net.flipsports.gmx.streaming.internal.notifications.configs.{AppConfig, ConfigurationLoader}

abstract class BaseNotificatiorJob  extends DefaultExecutionEnvironment {

  lazy val config: AppConfig = loadConfiguration

  private def loadConfiguration: AppConfig = ConfigurationLoader.apply

}
