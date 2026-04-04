package SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1

import scala.collection.JavaConverters._

object CustomerDetailWrapper {
  val javaWrapper = new CustomerDetailJWrapper()

  def fromJson(json: String): CustomerDetail = javaWrapper.fromJson(json)

  def fromJsonList(json: String): Seq[CustomerDetail] = javaWrapper.fromJsonList(json).asScala

  def toJson(value: CustomerDetail): String = javaWrapper.toJson(value)

}
