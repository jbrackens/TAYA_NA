package net.flipsports.gmx.streaming.sbtech.job.v1.single

import net.flipsports.gmx.streaming.common.job.{MetaParameters, RedZoneMetaParameters}
import net.flipsports.gmx.streaming.sbtech.job.AbstractSbtechJobs
import net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams.WalletTransactionsDataStream

object WalletTransactionRedzoneJob extends AbstractSbtechJobs("wallet transactions", new RedZoneMetaParameters {})  {

  def main(args: Array[String]): Unit = WalletTransactionsDataStream.execute(MetaParameters(name), businessMetaParams, config)

}
