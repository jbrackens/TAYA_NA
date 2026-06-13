package net.flipsports.gmx.streaming.sbtech.job

import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, DefaultExecutionEnvironment}
import net.flipsports.gmx.streaming.sbtech.configs.{AppConfig, ConfigurationLoader}

abstract class AbstractSbtechJobs(jobName: String, params: BusinessMetaParameters)  extends DefaultExecutionEnvironment {

  lazy val config: AppConfig = loadConfiguration

  lazy val businessMetaParams = params

  lazy val name = s"Sport events for $jobName on brand ${businessMetaParams.brand().sourceBrand.name}"

  def loadConfiguration: AppConfig = ConfigurationLoader.apply

}
