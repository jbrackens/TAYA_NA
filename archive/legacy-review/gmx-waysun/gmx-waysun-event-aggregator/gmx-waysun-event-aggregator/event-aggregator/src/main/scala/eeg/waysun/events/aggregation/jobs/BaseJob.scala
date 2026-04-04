package eeg.waysun.events.aggregation.jobs

import eeg.waysun.events.aggregation.configs.AppConfigDef.{AppConfig, ConfigurationLoader}
import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, DefaultExecutionEnvironment}

class BaseJob(jobName: String, params: BusinessMetaParameters) extends DefaultExecutionEnvironment {

  lazy val config: AppConfig = loadConfiguration

  lazy val businessMetaParams = params

  lazy val name = s"Aggregation $jobName events on brand ${businessMetaParams.brand().sourceBrand.name}"

  def loadConfiguration: AppConfig = ConfigurationLoader.apply

}
