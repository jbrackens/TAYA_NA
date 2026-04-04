package net.flipsports.gmx.streaming.sbtech.job

import net.flipsports.gmx.streaming.common.job.DefaultExecutionEnvironment
import net.flipsports.gmx.streaming.sbtech.configs.{ConfigurationLoader, SbTechConfig}

abstract class AbstractSbtechJobs extends DefaultExecutionEnvironment {

  lazy val config: SbTechConfig = loadConfiguration

  private def loadConfiguration: SbTechConfig = ConfigurationLoader.apply("sbTech").get

}
