package net.flipsports.gmx.streaming.sbtech.mappers.v1

import SBTech.Microservices.DataStreaming.DTO.WalletTransaction.v1.{WalletTransaction, WalletTransactionCustomerId}
import org.apache.flink.api.common.functions.MapFunction
import org.apache.flink.api.java.tuple.Tuple2

class WalletTransactionToKeyed extends MapFunction[Tuple2[Long, WalletTransaction], Tuple2[WalletTransactionCustomerId, WalletTransaction]] {

  override def map(bet: Tuple2[Long, WalletTransaction]): Tuple2[WalletTransactionCustomerId, WalletTransaction] = new Tuple2(new WalletTransactionCustomerId(bet.f1.getCustomerID), bet.f1)

}
