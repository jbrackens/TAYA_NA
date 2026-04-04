package SBTech.Microservices.DataStreaming.DTO.Login.v1

import scala.collection.JavaConverters._

object LoginCustomerIdWrapper {
  val javaWrapper = new LoginCustomerIdJWrapper()

  def fromJson(json: String): LoginCustomerId = javaWrapper.fromJson(json)

  def fromJsonList(json: String): Seq[LoginCustomerId] = javaWrapper.fromJsonList(json).asScala

  def toJson(value: LoginCustomerId): String = javaWrapper.toJson(value)

}
