package SBTech.Microservices.DataStreaming.DTO.WalletTransaction.v1

import scala.collection.JavaConverters._

object WalletTransactionCustomerIdWrapper {
  val javaWrapper = new WalletTransactionCustomerIdJWrapper()

  def fromJson(json: String): WalletTransactionCustomerId = javaWrapper.fromJson(json)

  def fromJsonList(json: String): Seq[WalletTransactionCustomerId] = javaWrapper.fromJsonList(json).asScala

  def toJson(value: WalletTransactionCustomerId): String = javaWrapper.toJson(value)

}
