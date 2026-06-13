package net.flipsports.gmx.streaming.sbtech.job.v1

import net.flipsports.gmx.streaming.common.job.{MetaParameters, SportNationMetaParameters}
import net.flipsports.gmx.streaming.sbtech.job.AbstractSbtechJobs
import net.flipsports.gmx.streaming.sbtech.processors.v1.CasinoBetStream

object CasinoBetSportsNationJob extends AbstractSbtechJobs  {

  val brand = new SportNationMetaParameters {}

  val name = s"Casino bets events on brand ${brand.brand().sourceBrand.name}"

  def main(args: Array[String]): Unit = CasinoBetStream.execute(MetaParameters(name), brand , config)

}
