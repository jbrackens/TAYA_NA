package SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1

import scala.collection.JavaConverters._

object CustomerDetailCustomerIdWrapper {
  val javaWrapper = new CustomerDetailCustomerIdJWrapper()

  def fromJson(json: String): CustomerDetailCustomerId = javaWrapper.fromJson(json)

  def fromJsonList(json: String): Seq[CustomerDetailCustomerId] = javaWrapper.fromJsonList(json).asScala

  def toJson(value: CustomerDetailCustomerId): String = javaWrapper.toJson(value)

}
