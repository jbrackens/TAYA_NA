package gmx.users.internal

import SBTech.Microservices.DataStreaming.DTO.WalletTransaction.v1.{ WalletTransaction, WalletTransactionJWrapper }
import gmx.common.internal.scala.test.FileDataProvider

import scala.jdk.CollectionConverters._

class WalletTransactionDataProvider(source: String) extends FileDataProvider[WalletTransaction] {

  override protected def sourceFile: String = source

  override protected def fromJson(json: String): Seq[WalletTransaction] =
    new WalletTransactionJWrapper().fromJsonList(json).asScala.toSeq

}
