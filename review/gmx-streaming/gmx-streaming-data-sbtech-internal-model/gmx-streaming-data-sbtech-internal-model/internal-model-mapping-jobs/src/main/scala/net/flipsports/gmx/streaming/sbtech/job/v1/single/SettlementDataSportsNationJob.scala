package net.flipsports.gmx.streaming.sbtech.job.v1.single

import net.flipsports.gmx.streaming.common.job.{MetaParameters, SportNationMetaParameters}
import net.flipsports.gmx.streaming.sbtech.job.AbstractSbtechJobs
import net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams.SettlementDataStream

object SettlementDataSportsNationJob extends AbstractSbtechJobs("sport bets", new SportNationMetaParameters {})  {

  def main(args: Array[String]): Unit = SettlementDataStream.execute(MetaParameters(name), businessMetaParams, config)

}
