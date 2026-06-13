package net.flipsports.gmx.streaming.sbtech.job.v1.single

import net.flipsports.gmx.streaming.common.job.{FansbetUkMetaParameters, MetaParameters}
import net.flipsports.gmx.streaming.sbtech.job.AbstractSbtechJobs
import net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams.CustomerDetailsStream

object CustomerDetailsFansbetUkJob extends AbstractSbtechJobs("customer details", new FansbetUkMetaParameters {})  {

  def main(args: Array[String]): Unit = CustomerDetailsStream.execute(MetaParameters(name), businessMetaParams, config)

}
