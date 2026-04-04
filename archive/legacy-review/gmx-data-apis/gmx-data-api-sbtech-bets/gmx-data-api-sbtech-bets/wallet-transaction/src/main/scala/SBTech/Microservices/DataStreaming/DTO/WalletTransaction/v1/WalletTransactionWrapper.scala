package SBTech.Microservices.DataStreaming.DTO.WalletTransaction.v1

import scala.collection.JavaConverters._

object WalletTransactionWrapper {
  val javaWrapper = new WalletTransactionJWrapper()

  def fromJson(json: String): WalletTransaction = javaWrapper.fromJson(json)

  def fromJsonList(json: String): Seq[WalletTransaction] = javaWrapper.fromJsonList(json).asScala

  def toJson(value: WalletTransaction): String = javaWrapper.toJson(value)

}
