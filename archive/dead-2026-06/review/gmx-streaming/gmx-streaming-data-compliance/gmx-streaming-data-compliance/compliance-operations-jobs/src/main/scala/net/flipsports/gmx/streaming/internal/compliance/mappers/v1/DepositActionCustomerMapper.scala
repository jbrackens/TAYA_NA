package net.flipsports.gmx.streaming.internal.compliance.mappers.v1

import java.nio.charset.StandardCharsets

import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.internal.compliance.Types
import org.apache.flink.api.common.functions.MapFunction
import org.apache.flink.api.java.tuple.{Tuple2 => FlinkTuple2}
import org.apache.flink.shaded.curator.org.apache.curator.shaded.com.google.common.hash.Hashing


class DepositActionCustomerMapper(brand: Brand) extends MapFunction[Types.WalletTransactions.Source, Types.DepositAction.Source] {
  override def map(record: Types.WalletTransactions.Source): Types.DepositAction.Source = {
    val walletTransaction = record.f1
    val key = new Types.DepositAction.KeyType(
      customerId = walletTransaction.getCustomerID(),
      transactionId = walletTransaction.getWalletTransactionID()
    )

    val hashOnMeaningFields: String = hash(walletTransaction)


    val value = new Types.DepositAction.ValueType(
      actionHash =  hashOnMeaningFields,
      time = record.f1.getMessageCreationDate
    )

    new FlinkTuple2[Types.DepositAction.KeyType, Types.DepositAction.ValueType](key, value)
  }


  def hash(source: Types.WalletTransactions.ValueType): String = {
    val amount = source.getAmountGBP()
    val status = source.getStatus()
    val operationType = source.getOperationTypeID()
    val transactionId = source.getWalletTransactionID()

    val toHash = s"$amount-$status-$operationType-$transactionId"

    Hashing.sha256()
      .hashString(toHash, StandardCharsets.UTF_8)
      .toString()
  }
}

object DepositActionCustomerMapper {

  def apply(brand: Brand): MapFunction[Types.WalletTransactions.Source, Types.DepositAction.Source] =
    new DepositActionCustomerMapper(brand)
}



