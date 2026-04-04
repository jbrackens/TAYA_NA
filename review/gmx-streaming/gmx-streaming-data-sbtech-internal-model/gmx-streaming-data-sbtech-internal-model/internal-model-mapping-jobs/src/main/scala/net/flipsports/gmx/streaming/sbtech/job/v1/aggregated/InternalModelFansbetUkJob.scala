package net.flipsports.gmx.streaming.sbtech.job.v1.aggregated

import net.flipsports.gmx.streaming.common.job.{MetaParameters, FansbetUkMetaParameters}
import net.flipsports.gmx.streaming.sbtech.configs.Features
import net.flipsports.gmx.streaming.sbtech.job.AbstractSbtechJobs
import net.flipsports.gmx.streaming.sbtech.processors.v1.aggregated.InternalModelMapperStream

object InternalModelFansbetUkJob extends AbstractSbtechJobs("all topics", new FansbetUkMetaParameters {}) {

  val features = Features(
    customerDetails = true,
    casinoBets = true,
    sportBets = true,
    walletTransactions = true,
    logins = true,
    offerEvents = true,
    offerOptions = true
  )

  def main(args: Array[String]): Unit = InternalModelMapperStream.execute(features, MetaParameters(name), businessMetaParams, config)

}
