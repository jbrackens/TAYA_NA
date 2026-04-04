package SBTech.Microservices.DataStreaming.DTO.LineInfo.v1

import scala.collection.JavaConverters._

object LineInfoIdWrapper {
  val javaWrapper = new LineInfoIdJWrapper()

  def fromJson(json: String): LineInfoId = javaWrapper.fromJson(json)

  def fromJsonList(json: String): Seq[LineInfoId] = javaWrapper.fromJsonList(json).asScala

  def toJson(value: LineInfoId): String = javaWrapper.toJson(value)

}
