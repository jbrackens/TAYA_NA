package SBTech.Microservices.DataStreaming.DTO.EventsInfo.v1

import scala.collection.JavaConverters._

object EventInfoIdWrapper {
  val javaWrapper = new EventInfoIdJWrapper()

  def fromJson(json: String): EventInfoId = javaWrapper.fromJson(json)

  def fromJsonList(json: String): Seq[EventInfoId] = javaWrapper.fromJsonList(json).asScala

  def toJson(value: EventInfoId): String = javaWrapper.toJson(value)

}
