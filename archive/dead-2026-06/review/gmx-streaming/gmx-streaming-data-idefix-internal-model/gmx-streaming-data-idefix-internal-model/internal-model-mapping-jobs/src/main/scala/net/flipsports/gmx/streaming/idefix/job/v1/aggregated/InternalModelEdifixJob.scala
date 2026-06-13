package net.flipsports.gmx.streaming.idefix.job.v1.aggregated

import net.flipsports.gmx.streaming.common.job.{MetaParameters, SportNationMetaParameters}
import net.flipsports.gmx.streaming.idefix.configs.Features
import net.flipsports.gmx.streaming.idefix.job.AbstractJobs
import net.flipsports.gmx.streaming.idefix.processors.v1.aggregated.InternalModelMapperStream

object InternalModelEdifixJob extends AbstractJobs("all topics", new SportNationMetaParameters {}) {

  val features = Features(
    customerDetails = true,
    walletTransactions = true
  )

  def main(args: Array[String]): Unit = InternalModelMapperStream.execute(features, MetaParameters(name), businessMetaParams, config)

}
