package net.flipsports.gmx.streaming.sbtech.job.v1.single

import net.flipsports.gmx.streaming.common.job.{FansbetUkMetaParameters, MetaParameters}
import net.flipsports.gmx.streaming.sbtech.job.AbstractSbtechJobs
import net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams.WalletTransactionsDataStream

object WalletTransactionFansbetUkJob extends AbstractSbtechJobs("wallet transactions", new FansbetUkMetaParameters {})  {

  def main(args: Array[String]): Unit = WalletTransactionsDataStream.execute(MetaParameters(name), businessMetaParams, config)

}
