package net.flipsports.gmx.streaming.sbtech.job.v1.single

import net.flipsports.gmx.streaming.common.job.{MetaParameters, RedZoneMetaParameters}
import net.flipsports.gmx.streaming.sbtech.job.AbstractSbtechJobs
import net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams.SettlementDataStream

object SettlementDataRedzoneJob extends AbstractSbtechJobs("sport bets", new RedZoneMetaParameters {})  {

  def main(args: Array[String]): Unit = SettlementDataStream.execute(MetaParameters(name), businessMetaParams, config)

}
