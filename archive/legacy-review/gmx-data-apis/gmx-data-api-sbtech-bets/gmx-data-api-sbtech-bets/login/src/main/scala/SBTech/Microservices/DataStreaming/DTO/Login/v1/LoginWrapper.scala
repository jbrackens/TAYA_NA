package SBTech.Microservices.DataStreaming.DTO.Login.v1

import scala.collection.JavaConverters._

object LoginWrapper {
  val javaWrapper = new LoginJWrapper()

  def fromJson(json: String): Login = javaWrapper.fromJson(json)

  def fromJsonList(json: String): Seq[Login] = javaWrapper.fromJsonList(json).asScala

  def toJson(value: Login): String = javaWrapper.toJson(value)

}
