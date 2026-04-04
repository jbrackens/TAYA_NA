package net.flipsports.gmx.streaming.internal.compliance.data.v1

import SBTech.Microservices.DataStreaming.DTO.WalletTransaction.v1.WalletTransactionWrapper
import net.flipsports.gmx.streaming.internal.compliance.Types.WalletTransactions
import net.flipsports.gmx.streaming.internal.compliance.Types.WalletTransactions.{KeyType, ValueType}
import org.apache.flink.api.java.tuple.Tuple2


object WalletTransactionDataProvider extends DataProvider[Tuple2[WalletTransactions.KeyType, WalletTransactions.ValueType]] {

  val correctTransactionCustomerId = 99999

  override def sourceFile: String = "wallettransactions.json"

  override def fromJson(json: String): Seq[Tuple2[KeyType, ValueType]] = WalletTransactionWrapper.fromJsonList(json).map(i => new Tuple2(new KeyType(i.getCustomerID), i))

}
