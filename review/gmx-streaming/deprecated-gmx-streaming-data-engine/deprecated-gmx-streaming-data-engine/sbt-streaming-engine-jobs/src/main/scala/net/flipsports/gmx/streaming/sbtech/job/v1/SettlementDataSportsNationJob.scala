package net.flipsports.gmx.streaming.sbtech.job.v1

import net.flipsports.gmx.streaming.sbtech.job.{AbstractSbtechJobs, SportsNation}
import net.flipsports.gmx.streaming.sbtech.processors.v1.SettlementDataStream

object SettlementDataSportsNationJob extends AbstractSbtechJobs with SportsNation {

  def main(args: Array[String]): Unit = SettlementDataStream.execute(brand)(config)

}
