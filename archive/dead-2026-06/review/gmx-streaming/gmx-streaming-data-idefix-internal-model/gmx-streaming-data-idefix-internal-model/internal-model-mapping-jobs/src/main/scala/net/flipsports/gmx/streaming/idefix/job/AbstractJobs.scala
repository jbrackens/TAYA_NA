package net.flipsports.gmx.streaming.idefix.job

import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, DefaultExecutionEnvironment}
import net.flipsports.gmx.streaming.idefix.configs.{ConfigurationLoader, IdefixConfig}

abstract class AbstractJobs(jobName: String, params: BusinessMetaParameters) extends DefaultExecutionEnvironment {

  lazy val config: IdefixConfig = loadConfiguration

  lazy val name = s"Mapping $jobName to internal model on brand ${params.brand().sourceBrand.name}"

  lazy val businessMetaParams = params

  private def loadConfiguration: IdefixConfig = ConfigurationLoader.apply("sbTech").get

}
