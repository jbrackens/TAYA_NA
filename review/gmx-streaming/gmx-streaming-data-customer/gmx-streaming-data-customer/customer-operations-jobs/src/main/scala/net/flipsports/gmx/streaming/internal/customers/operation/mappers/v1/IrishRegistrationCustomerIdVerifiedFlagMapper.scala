package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1

import net.flipsports.gmx.dataapi.internal.customers.operations._
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.internal.customers.operation.Types.{CustomerStateChange, JoinedCustomerDetailWithLogins}
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.{Flag, OperationTrigger}
import org.apache.flink.api.java.tuple.Tuple2

class IrishRegistrationCustomerIdVerifiedFlagMapper(brand: Brand) extends StateChangeTransformer
  with ConditionalMapFunction[JoinedCustomerDetailWithLogins.KeyType, JoinedCustomerDetailWithLogins.ValueType, CustomerStateChange.KeyType, CustomerStateChange.ValueType] {

  override def map(value: Tuple2[JoinedCustomerDetailWithLogins.KeyType, JoinedCustomerDetailWithLogins.ValueType]): Tuple2[CustomerOperationId, StateChange] =
    transform(value.f1.customerDetail, brand, ActionType.FLAG)

  override def transformPayload(): String = Flag.CustomerIdVerified.name

  override def operationTrigger(): String = OperationTrigger.CustomerRegistration.name
}