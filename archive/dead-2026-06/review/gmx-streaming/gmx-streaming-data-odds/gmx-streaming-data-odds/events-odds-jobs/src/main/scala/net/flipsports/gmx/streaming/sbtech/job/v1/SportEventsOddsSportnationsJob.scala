package net.flipsports.gmx.streaming.sbtech.job.v1

import net.flipsports.gmx.streaming.common.job.{MetaParameters, SportNationMetaParameters}
import net.flipsports.gmx.streaming.sbtech.configs.{AppConfig, Features}
import net.flipsports.gmx.streaming.sbtech.job.AbstractSbtechJobs
import net.flipsports.gmx.streaming.sbtech.streams.OddsStream

object SportEventsOddsSportnationsJob extends AbstractSbtechJobs("sport events update", new SportNationMetaParameters {}) {

  override lazy val config: AppConfig = loadConfiguration.copy(features = Features.allIn())

  def main(args: Array[String]): Unit = OddsStream.execute(MetaParameters(name), businessMetaParams , config)
}