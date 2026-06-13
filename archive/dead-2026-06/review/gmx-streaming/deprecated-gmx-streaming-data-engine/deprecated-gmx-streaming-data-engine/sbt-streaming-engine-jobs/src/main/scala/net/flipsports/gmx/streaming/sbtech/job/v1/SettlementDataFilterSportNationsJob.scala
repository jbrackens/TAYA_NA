package net.flipsports.gmx.streaming.sbtech.job.v1

import net.flipsports.gmx.streaming.sbtech.job.{AbstractSbtechJobs, SportsNation}
import net.flipsports.gmx.streaming.sbtech.processors.v1.SettlementDataFilterStream

object SettlementDataFilterSportNationsJob extends AbstractSbtechJobs with SportsNation {

  def main(args: Array[String]): Unit = SettlementDataFilterStream.execute(brand)(config)

}
