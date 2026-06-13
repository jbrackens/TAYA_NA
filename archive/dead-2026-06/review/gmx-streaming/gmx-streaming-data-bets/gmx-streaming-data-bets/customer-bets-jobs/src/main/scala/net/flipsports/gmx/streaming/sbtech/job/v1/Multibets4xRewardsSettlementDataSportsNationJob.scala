package net.flipsports.gmx.streaming.sbtech.job.v1

import net.flipsports.gmx.streaming.common.job.{MetaParameters, SportNationMetaParameters}
import net.flipsports.gmx.streaming.sbtech.job.AbstractSbtechJobs
import net.flipsports.gmx.streaming.sbtech.processors.v1.Multibets4xRewardsSettlementDataStream

object Multibets4xRewardsSettlementDataSportsNationJob extends AbstractSbtechJobs  {

  val brand = new SportNationMetaParameters {}

  val name = s"Rewards marketing settlement data ${brand.brand().sourceBrand.name}"

  def main(args: Array[String]): Unit = Multibets4xRewardsSettlementDataStream.execute(MetaParameters(name), brand , config)

}
