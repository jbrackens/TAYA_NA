package net.flipsports.gmx.streaming.data.v1

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.{SettlementData, SettlementDataWrapper}

class SettlementDataProvider(source: String = "settlementdata.json") extends DataProvider[SettlementData] {

  val externalUserId = 19996852

  override def sourceFile: String = source

  override def fromJson(json: String) = SettlementDataWrapper.fromJsonList(json)

}

object SettlementDataProvider {

  def apply: SettlementDataProvider = new SettlementDataProvider

  def apply(source: String) = new SettlementDataProvider(source)


  def all: Seq[SettlementData] = apply.all
}
