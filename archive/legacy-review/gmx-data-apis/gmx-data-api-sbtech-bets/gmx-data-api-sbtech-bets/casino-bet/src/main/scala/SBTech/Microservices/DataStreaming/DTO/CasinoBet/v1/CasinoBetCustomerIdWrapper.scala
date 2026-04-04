package SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1

import scala.collection.JavaConverters._

object CasinoBetCustomerIdWrapper {
  val javaWrapper = new CasinoBetCustomerIdJWrapper()

  def fromJson(json: String): CasinoBetCustomerId = javaWrapper.fromJson(json)

  def fromJsonList(json: String): Seq[CasinoBetCustomerId] = javaWrapper.fromJsonList(json).asScala

  def toJson(value: CasinoBetCustomerId): String = javaWrapper.toJson(value)

}
