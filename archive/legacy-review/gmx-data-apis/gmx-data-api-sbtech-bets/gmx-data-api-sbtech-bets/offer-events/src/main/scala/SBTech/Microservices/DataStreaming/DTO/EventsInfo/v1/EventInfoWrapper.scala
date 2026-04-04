package SBTech.Microservices.DataStreaming.DTO.EventsInfo.v1

import scala.collection.JavaConverters._

object EventInfoWrapper {
  val javaWrapper = new EventInfoJWrapper()

  def fromJson(json: String): EventInfo = javaWrapper.fromJson(json)

  def fromJsonList(json: String): Seq[EventInfo] = javaWrapper.fromJsonList(json).asScala

  def toJson(value: EventInfo): String = javaWrapper.toJson(value)

}
