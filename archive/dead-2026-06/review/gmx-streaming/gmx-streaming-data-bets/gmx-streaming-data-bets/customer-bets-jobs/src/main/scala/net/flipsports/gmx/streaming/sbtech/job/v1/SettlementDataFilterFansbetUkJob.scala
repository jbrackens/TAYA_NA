package net.flipsports.gmx.streaming.sbtech.job.v1

import net.flipsports.gmx.streaming.common.job.{MetaParameters, FansbetUkMetaParameters}
import net.flipsports.gmx.streaming.sbtech.job.AbstractSbtechJobs
import net.flipsports.gmx.streaming.sbtech.processors.v1.SettlementDataFilterStream

object SettlementDataFilterFansbetUkJob extends AbstractSbtechJobs {

  val brand = new FansbetUkMetaParameters {}

  val name = s"Sport bets filter on brand ${brand.brand().sourceBrand.name}"

  def main(args: Array[String]): Unit = SettlementDataFilterStream.execute(MetaParameters(name), brand, config)

}
