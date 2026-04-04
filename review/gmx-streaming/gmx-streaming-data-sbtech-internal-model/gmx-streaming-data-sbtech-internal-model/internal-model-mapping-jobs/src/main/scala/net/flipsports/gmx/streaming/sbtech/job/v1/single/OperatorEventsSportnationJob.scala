package net.flipsports.gmx.streaming.sbtech.job.v1.single

import net.flipsports.gmx.streaming.common.job.{MetaParameters, SportNationMetaParameters}
import net.flipsports.gmx.streaming.sbtech.job.AbstractSbtechJobs
import net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams.OperatorEventsDataStream

object OperatorEventsSportnationJob extends AbstractSbtechJobs("odds events", new SportNationMetaParameters {})  {

  def main(args: Array[String]): Unit = OperatorEventsDataStream.execute(MetaParameters(name), businessMetaParams , config)

}