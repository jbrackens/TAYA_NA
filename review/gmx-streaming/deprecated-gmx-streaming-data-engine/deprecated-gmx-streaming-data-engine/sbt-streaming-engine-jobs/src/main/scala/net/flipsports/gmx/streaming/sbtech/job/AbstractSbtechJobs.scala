package net.flipsports.gmx.streaming.sbtech.job

import net.flipsports.gmx.streaming.common.job.ExecutionEnvironment
import net.flipsports.gmx.streaming.sbtech.configs.{ConfigurationLoader, SbTechConfig}

abstract class AbstractSbtechJobs extends ExecutionEnvironment with Brand {

  implicit lazy val config: SbTechConfig = loadConfiguration

  private def loadConfiguration: SbTechConfig = ConfigurationLoader.apply("sbTech").get

}
