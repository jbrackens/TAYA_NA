package net.flipsports.gmx.streaming.idefix.job.v1.single

import net.flipsports.gmx.streaming.common.job.{MetaParameters, SportNationMetaParameters}
import net.flipsports.gmx.streaming.idefix.job.AbstractJobs
import net.flipsports.gmx.streaming.idefix.processors.v1.downstreams.EventStream

object EventsEdifixJob extends AbstractJobs("casino bets", new SportNationMetaParameters {})  {

  def main(args: Array[String]): Unit = EventStream.execute(MetaParameters(name), businessMetaParams , config)

}
