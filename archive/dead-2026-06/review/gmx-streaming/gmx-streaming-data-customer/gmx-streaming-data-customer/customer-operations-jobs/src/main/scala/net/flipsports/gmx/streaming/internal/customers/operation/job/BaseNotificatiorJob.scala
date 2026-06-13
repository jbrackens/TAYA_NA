package net.flipsports.gmx.streaming.internal.customers.operation.job

import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, DefaultExecutionEnvironment}
import net.flipsports.gmx.streaming.internal.customers.operation.configs.{AppConfig, ConfigurationReader}

abstract class BaseNotificatiorJob(jobName: String, params: BusinessMetaParameters)  extends DefaultExecutionEnvironment {

  lazy val config: AppConfig = loadConfiguration

  lazy val businessMetaParams = params

  lazy val name = s"Customer $jobName operation events on brand ${businessMetaParams.brand().sourceBrand.name}"

  def loadConfiguration: AppConfig = ConfigurationReader.load()

}
