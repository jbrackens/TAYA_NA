package net.flipsports.gmx.streaming.internal.compliance.mappers.v1

import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.internal.compliance.Types.{Compliance, WalletTransactions}
import net.flipsports.gmx.streaming.internal.compliance.dictionaries.OperationTrigger
import org.apache.flink.api.java.tuple.Tuple2

class DepositChangeCustomerVerifiedTagMapper(brand: Brand) extends ComplianceCheckTransformer
  with ConditionalMapFunction[WalletTransactions.KeyType, WalletTransactions.ValueType, Compliance.KeyType, Compliance.ValueType] {

  override def map(value: Tuple2[WalletTransactions.KeyType, WalletTransactions.ValueType]): Tuple2[Compliance.KeyType, Compliance.ValueType] = {
   transform(value.f1, brand, OperationTrigger.DepositChange)
  }

}

object DepositChangeCustomerVerifiedTagMapper {

  def apply(brand: Brand): DepositChangeCustomerVerifiedTagMapper = new DepositChangeCustomerVerifiedTagMapper(brand)

}

