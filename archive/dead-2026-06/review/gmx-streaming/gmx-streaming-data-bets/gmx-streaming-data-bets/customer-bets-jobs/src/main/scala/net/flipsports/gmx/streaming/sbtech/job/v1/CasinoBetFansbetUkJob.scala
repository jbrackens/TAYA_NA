package net.flipsports.gmx.streaming.sbtech.job.v1

import net.flipsports.gmx.streaming.common.job.{MetaParameters, FansbetUkMetaParameters}
import net.flipsports.gmx.streaming.sbtech.job.AbstractSbtechJobs
import net.flipsports.gmx.streaming.sbtech.processors.v1.CasinoBetStream

object CasinoBetFansbetUkJob extends AbstractSbtechJobs  {

  val brand = new FansbetUkMetaParameters {}

  val name = s"Casino bets events on brand ${brand.brand().sourceBrand.name}"

  def main(args: Array[String]): Unit = CasinoBetStream.execute(MetaParameters(name), brand , config)

}
