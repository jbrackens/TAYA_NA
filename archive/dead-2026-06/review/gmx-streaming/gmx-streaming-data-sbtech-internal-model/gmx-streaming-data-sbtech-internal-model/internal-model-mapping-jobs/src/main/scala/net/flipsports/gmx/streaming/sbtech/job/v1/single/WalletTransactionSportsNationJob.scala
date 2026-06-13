package net.flipsports.gmx.streaming.sbtech.job.v1.single

import net.flipsports.gmx.streaming.common.job.{MetaParameters, SportNationMetaParameters}
import net.flipsports.gmx.streaming.sbtech.job.AbstractSbtechJobs
import net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams.WalletTransactionsDataStream

object WalletTransactionSportsNationJob extends AbstractSbtechJobs("wallet transactions", new SportNationMetaParameters {})  {

  def main(args: Array[String]): Unit = WalletTransactionsDataStream.execute(MetaParameters(name), businessMetaParams, config)

}
