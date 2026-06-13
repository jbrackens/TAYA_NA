package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1

import net.flipsports.gmx.dataapi.internal.customers.operations.ActionType
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.internal.customers.operation.Types
import net.flipsports.gmx.streaming.internal.customers.operation.Types.CustomerStateChange
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.{Flag, OperationTrigger}
import org.apache.flink.api.java.tuple.Tuple2

class DummyPreJoinCustomerConditionalMapper(brand: Brand) extends StateChangeTransformer
  with ConditionalMapFunction[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType, CustomerStateChange.KeyType, CustomerStateChange.ValueType]{

  override def map(record: Tuple2[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType]): Tuple2[CustomerStateChange.KeyType, CustomerStateChange.ValueType] =
    transform(record.f1, brand, ActionType.FLAG)

  override def transformPayload(): String = Flag.CustomerAddressVerified.name

  override def operationTrigger(): String = OperationTrigger.DummyFlow.name

}

object DummyPreJoinCustomerConditionalMapper {
  def apply(brand: Brand): DummyPreJoinCustomerConditionalMapper = new DummyPreJoinCustomerConditionalMapper(brand)
}