package SBTech.Microservices.DataStreaming.DTO.SportBets.v1

import scala.collection.JavaConverters._

object SettlementDataWrapper {
  val javaWrapper = new SettlementDataJWrapper()

  def fromJson(json: String): SettlementData = javaWrapper.fromJson(json)

  def fromJsonList(json: String): Seq[SettlementData] = javaWrapper.fromJsonList(json).asScala

  def toJson(value: SettlementData): String = javaWrapper.toJson(value)

}
