package net.flipsports.gmx.streaming.sbtech.job.v1

import net.flipsports.gmx.streaming.sbtech.job.{AbstractSbtechJobs, SportsNation}
import net.flipsports.gmx.streaming.sbtech.processors.v1.RewardsMarketingSettlementDataStream

object RewardsMarketSettlementDataSportsNationJob extends AbstractSbtechJobs with SportsNation {

  def main(args: Array[String]): Unit = RewardsMarketingSettlementDataStream.execute(brand)(config)

}
