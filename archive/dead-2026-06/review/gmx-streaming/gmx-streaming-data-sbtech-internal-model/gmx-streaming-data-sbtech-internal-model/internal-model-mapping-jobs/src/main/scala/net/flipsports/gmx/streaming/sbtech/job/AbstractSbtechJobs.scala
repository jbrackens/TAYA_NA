package net.flipsports.gmx.streaming.sbtech.job

import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, DefaultExecutionEnvironment}
import net.flipsports.gmx.streaming.sbtech.configs.{ConfigurationLoader, SbTechConfig}

abstract class AbstractSbtechJobs(jobName: String, params: BusinessMetaParameters) extends DefaultExecutionEnvironment {

  lazy val config: SbTechConfig = loadConfiguration

  lazy val name = s"Mapping $jobName to internal model on brand ${params.brand().sourceBrand.name}"

  lazy val businessMetaParams = params

  private def loadConfiguration: SbTechConfig = ConfigurationLoader.apply("sbTech").get

}
