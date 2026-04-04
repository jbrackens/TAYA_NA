package net.flipsports.gmx.streaming.sbtech.job.v1.single

import net.flipsports.gmx.streaming.common.job.{MetaParameters, RedZoneMetaParameters}
import net.flipsports.gmx.streaming.sbtech.job.AbstractSbtechJobs
import net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams.CasinoBetStream

object CasinoBetRedzoneJob extends AbstractSbtechJobs("casino bets", new RedZoneMetaParameters {})  {

  def main(args: Array[String]): Unit = CasinoBetStream.execute(MetaParameters(name), businessMetaParams , config)

}
