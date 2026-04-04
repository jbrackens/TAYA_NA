package net.flipsports.gmx.streaming.sbtech.job.v1.single

import net.flipsports.gmx.streaming.common.job.{MetaParameters, SportNationMetaParameters}
import net.flipsports.gmx.streaming.sbtech.job.AbstractSbtechJobs
import net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams.CasinoBetStream

object CasinoBetSportsNationJob extends AbstractSbtechJobs("casino bets", new SportNationMetaParameters {})  {

  def main(args: Array[String]): Unit = CasinoBetStream.execute(MetaParameters(name), businessMetaParams , config)

}
