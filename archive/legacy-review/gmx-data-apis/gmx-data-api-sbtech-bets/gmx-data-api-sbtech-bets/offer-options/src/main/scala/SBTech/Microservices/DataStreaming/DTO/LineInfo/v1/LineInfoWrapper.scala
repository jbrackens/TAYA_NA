package SBTech.Microservices.DataStreaming.DTO.LineInfo.v1

import scala.collection.JavaConverters._

object LineInfoWrapper {
  val javaWrapper = new LineInfoJWrapper()

  def fromJson(json: String): LineInfo = javaWrapper.fromJson(json)

  def fromJsonList(json: String): Seq[LineInfo] = javaWrapper.fromJsonList(json).asScala

  def toJson(value: LineInfo): String = javaWrapper.toJson(value)

}
