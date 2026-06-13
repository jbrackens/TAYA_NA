package net.flipsports.gmx.streaming.internal.compliance.job.v1

import net.flipsports.gmx.streaming.common.job.{MetaParameters, SportNationMetaParameters}
import net.flipsports.gmx.streaming.internal.compliance.job.BaseNotificatiorJob
import net.flipsports.gmx.streaming.internal.compliance.streams.ComplianceStream

object ComplianceStreamSportnationJob extends BaseNotificatiorJob(new SportNationMetaParameters {}){

  def main(args: Array[String]): Unit = ComplianceStream.execute(MetaParameters(name), businessMetaParams, config)

}
