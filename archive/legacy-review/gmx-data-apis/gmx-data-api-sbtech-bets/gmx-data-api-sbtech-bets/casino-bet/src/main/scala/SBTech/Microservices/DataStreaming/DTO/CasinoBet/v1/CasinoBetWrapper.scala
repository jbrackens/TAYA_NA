package SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1

import scala.collection.JavaConverters._

object CasinoBetWrapper {
  val javaWrapper = new CasinoBetJWrapper()

  def fromJson(json: String): CasinoBet = javaWrapper.fromJson(json)

  def fromJsonList(json: String): Seq[CasinoBet] = javaWrapper.fromJsonList(json).asScala

  def toJson(value: CasinoBet): String = javaWrapper.toJson(value)

}
