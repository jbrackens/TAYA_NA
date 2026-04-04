package net.flipsports.gmx.streaming.sbtech.job.v1

import net.flipsports.gmx.streaming.common.job.{MetaParameters, SportNationMetaParameters}
import net.flipsports.gmx.streaming.sbtech.job.AbstractSbtechJobs
import net.flipsports.gmx.streaming.sbtech.streams.MarketingCampaignsRewardsDataStream

object MarketingCampaignsRewardsSportsNationJob extends AbstractSbtechJobs  {

  val brand = new SportNationMetaParameters {}

  val name = s"Points earning amends and exemptions ${brand.brand().sourceBrand.name}"

  def main(args: Array[String]): Unit = MarketingCampaignsRewardsDataStream.execute(MetaParameters(name), brand , config)

}
