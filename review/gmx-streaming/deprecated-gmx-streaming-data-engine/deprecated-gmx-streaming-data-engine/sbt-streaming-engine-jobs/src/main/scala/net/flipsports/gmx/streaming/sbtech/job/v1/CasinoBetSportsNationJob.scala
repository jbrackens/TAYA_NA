package net.flipsports.gmx.streaming.sbtech.job.v1

import net.flipsports.gmx.streaming.sbtech.job.{AbstractSbtechJobs, SportsNation}
import net.flipsports.gmx.streaming.sbtech.processors.v1.CasinoBetStream

object CasinoBetSportsNationJob extends AbstractSbtechJobs with SportsNation {

  def main(args: Array[String]): Unit = CasinoBetStream.execute(brand)(config)

}
