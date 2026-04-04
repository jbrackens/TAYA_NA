package net.flipsports.gmx.streaming.sbtech.job.v1.single

import net.flipsports.gmx.streaming.common.job.{FansbetUkMetaParameters, MetaParameters}
import net.flipsports.gmx.streaming.sbtech.job.AbstractSbtechJobs
import net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams.OfferEventsDataStream

object OfferEventsFansbetUkJob extends AbstractSbtechJobs("offer events", new FansbetUkMetaParameters {})  {

  def main(args: Array[String]): Unit = OfferEventsDataStream.execute(MetaParameters(name), businessMetaParams, config)

}
