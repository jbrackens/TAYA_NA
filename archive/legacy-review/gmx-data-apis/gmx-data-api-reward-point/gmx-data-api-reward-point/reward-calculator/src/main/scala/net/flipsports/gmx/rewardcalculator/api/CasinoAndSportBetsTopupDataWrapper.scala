package net.flipsports.gmx.rewardcalculator.api

import scala.collection.JavaConverters._

object CasinoAndSportBetsTopupDataWrapper {

  def fromJson(json: String): CasinoAndSportBetsTopupData = new CasinoAndSportBetsTopupDataJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[CasinoAndSportBetsTopupData] = new CasinoAndSportBetsTopupDataJWrapper().fromJsonList(json).asScala

  def toJson(value: CasinoAndSportBetsTopupData) = new CasinoAndSportBetsTopupDataJWrapper().toJson(value)

}
