package net.flipsports.gmx.streaming.internal.compliance.job.v1

import net.flipsports.gmx.streaming.common.job.{MetaParameters, FansbetUkMetaParameters}
import net.flipsports.gmx.streaming.internal.compliance.job.BaseNotificatiorJob
import net.flipsports.gmx.streaming.internal.compliance.streams.ComplianceStream

object ComplianceStreamFansbetUkJob extends BaseNotificatiorJob(new FansbetUkMetaParameters {}){

  def main(args: Array[String]): Unit = ComplianceStream.execute(MetaParameters(name), businessMetaParams, config)

}
