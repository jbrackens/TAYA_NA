package net.flipsports.gmx.streaming.data.v1

import SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1.{CasinoBet, CasinoBetWrapper}


object CasinoBetDataProvider extends DataProvider[CasinoBet] {

  val amount: Double = 0.3

  val BetID = 164925227

  val CustomerID = 17397820

  override def sourceFile: String = "casinobets.json"

  override def fromJson(json: String): Seq[CasinoBet] = CasinoBetWrapper.fromJsonList(json)

}

