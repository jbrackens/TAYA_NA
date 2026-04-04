package eeg.waysun.events.validators.jobs

import eeg.waysun.events.validators.configs.AppConfigDef.{AppConfig, ConfigurationLoader}
import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, DefaultExecutionEnvironment}

class BaseJob(jobName: String, params: BusinessMetaParameters) extends DefaultExecutionEnvironment {

  lazy val config: AppConfig = loadConfiguration

  lazy val businessMetaParams = params

  lazy val name = s"Validation $jobName events on brand ${businessMetaParams.brand().sourceBrand.name}"

  def loadConfiguration: AppConfig = ConfigurationLoader.apply

}
