package net.flipsports.gmx.streaming.sbtech.job.v1.single

import net.flipsports.gmx.streaming.common.job.{MetaParameters, SportNationMetaParameters}
import net.flipsports.gmx.streaming.sbtech.job.AbstractSbtechJobs
import net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams.CustomerDetailsStream

object CustomerDetailsSportsNationJob extends AbstractSbtechJobs("customer details", new SportNationMetaParameters {})  {

  def main(args: Array[String]): Unit = CustomerDetailsStream.execute(MetaParameters(name), businessMetaParams, config)

}
