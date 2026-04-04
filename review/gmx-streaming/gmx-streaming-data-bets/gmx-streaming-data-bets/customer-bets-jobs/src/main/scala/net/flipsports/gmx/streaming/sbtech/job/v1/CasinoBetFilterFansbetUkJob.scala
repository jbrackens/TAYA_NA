package net.flipsports.gmx.streaming.sbtech.job.v1

import net.flipsports.gmx.streaming.common.job.{MetaParameters, FansbetUkMetaParameters}
import net.flipsports.gmx.streaming.sbtech.job.AbstractSbtechJobs
import net.flipsports.gmx.streaming.sbtech.processors.v1.CasinoBetFilterStream

object CasinoBetFilterFansbetUkJob extends AbstractSbtechJobs {

  val brand = new FansbetUkMetaParameters {}

  val name = s"Casino bets filter on brand ${brand.brand().sourceBrand.name}"

  def main(args: Array[String]): Unit = CasinoBetFilterStream.execute(MetaParameters(name), brand , config)



}
