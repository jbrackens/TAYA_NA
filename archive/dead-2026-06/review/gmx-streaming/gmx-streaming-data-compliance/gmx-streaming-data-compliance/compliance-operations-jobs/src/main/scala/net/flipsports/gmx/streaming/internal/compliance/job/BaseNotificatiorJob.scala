package net.flipsports.gmx.streaming.internal.compliance.job

import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, DefaultExecutionEnvironment}
import net.flipsports.gmx.streaming.internal.compliance.configs.{AppConfig, ConfigurationLoader}

abstract class BaseNotificatiorJob(params: BusinessMetaParameters)  extends DefaultExecutionEnvironment {

  lazy val config: AppConfig = loadConfiguration

  lazy val businessMetaParams = params

  lazy val name = s"Compliance events on brand ${businessMetaParams.brand().sourceBrand.name}"

  def loadConfiguration: AppConfig = ConfigurationLoader.apply

}
