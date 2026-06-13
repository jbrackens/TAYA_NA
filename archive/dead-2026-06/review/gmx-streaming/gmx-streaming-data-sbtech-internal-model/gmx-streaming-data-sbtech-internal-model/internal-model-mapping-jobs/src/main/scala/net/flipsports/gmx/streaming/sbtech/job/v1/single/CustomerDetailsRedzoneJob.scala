package net.flipsports.gmx.streaming.sbtech.job.v1.single

import net.flipsports.gmx.streaming.common.job.{MetaParameters, RedZoneMetaParameters}
import net.flipsports.gmx.streaming.sbtech.job.AbstractSbtechJobs
import net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams.CustomerDetailsStream

object CustomerDetailsRedzoneJob extends AbstractSbtechJobs("customer details", new RedZoneMetaParameters {})  {

  def main(args: Array[String]): Unit = CustomerDetailsStream.execute(MetaParameters(name), businessMetaParams, config)

}
