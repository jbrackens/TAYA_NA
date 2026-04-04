package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1

import net.flipsports.gmx.dataapi.internal.customers.operations.ActionType
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.internal.customers.operation.Types.{CustomerStateChange, JoinedCustomerDetailWithLogins}
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.{Flag, OperationTrigger}
import org.apache.flink.api.java.tuple.Tuple2

class DummyJoinCustomerConditionalMapper(brand: Brand) extends StateChangeTransformer
  with ConditionalMapFunction[JoinedCustomerDetailWithLogins.KeyType, JoinedCustomerDetailWithLogins.ValueType, CustomerStateChange.KeyType, CustomerStateChange.ValueType]{

  override def map(record: Tuple2[JoinedCustomerDetailWithLogins.KeyType, JoinedCustomerDetailWithLogins.ValueType]): Tuple2[CustomerStateChange.KeyType, CustomerStateChange.ValueType] = {
    logger.info(s"Processing record for customer id${record.f0}")
    transform(record.f1.customerDetail, brand, ActionType.FLAG)
  }

  override def transformPayload(): String = Flag.CustomerAddressVerified.name

  override def operationTrigger(): String = OperationTrigger.DummyFlow.name

}

object DummyJoinCustomerConditionalMapper {

  def apply(brand: Brand): DummyJoinCustomerConditionalMapper = new DummyJoinCustomerConditionalMapper(brand)
}