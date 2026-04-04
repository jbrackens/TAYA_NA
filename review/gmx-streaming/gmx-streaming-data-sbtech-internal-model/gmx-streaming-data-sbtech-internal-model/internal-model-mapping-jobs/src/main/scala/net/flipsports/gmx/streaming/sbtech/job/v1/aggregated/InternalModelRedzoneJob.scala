package net.flipsports.gmx.streaming.sbtech.job.v1.aggregated

import net.flipsports.gmx.streaming.common.job.{MetaParameters, RedZoneMetaParameters}
import net.flipsports.gmx.streaming.sbtech.configs.Features
import net.flipsports.gmx.streaming.sbtech.job.AbstractSbtechJobs
import net.flipsports.gmx.streaming.sbtech.processors.v1.aggregated.InternalModelMapperStream

object InternalModelRedzoneJob extends AbstractSbtechJobs("all topics",  new RedZoneMetaParameters {}) {

  val features = Features(
    customerDetails = true,
    casinoBets = true,
    sportBets = true,
    walletTransactions = true,
    logins = true,
    odds = true
  )

  def main(args: Array[String]): Unit = InternalModelMapperStream.execute(features, MetaParameters(name), businessMetaParams, config)

}
