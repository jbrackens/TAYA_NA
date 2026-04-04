package SBTech.Microservices.DataStreaming.DTO.SportBets.v1

import scala.collection.JavaConverters._

object SettlementDataCustomerIdWrapper {
  val javaWrapper = new SettlementDataCustomerIdJWrapper()

  def fromJson(json: String): SettlementDataCustomerId = javaWrapper.fromJson(json)

  def fromJsonList(json: String): Seq[SettlementDataCustomerId] = javaWrapper.fromJsonList(json).asScala

  def toJson(value: SettlementDataCustomerId): String = javaWrapper.toJson(value)

}
