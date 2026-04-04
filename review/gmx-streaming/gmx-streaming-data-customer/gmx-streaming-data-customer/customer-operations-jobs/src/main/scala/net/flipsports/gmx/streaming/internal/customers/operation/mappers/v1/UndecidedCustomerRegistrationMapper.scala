package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1

import net.flipsports.gmx.dataapi.internal.customers.operations.ActionType
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.internal.customers.operation.Types.{CustomerDetail, CustomerStateChange, PreJoin}
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.{OperationTrigger, Tag}
import org.apache.flink.api.java.tuple.Tuple2

class UndecidedCustomerRegistrationMapper(brand: Brand) extends StateChangeTransformer
  with ConditionalMapFunction[PreJoin.KeyType, CustomerDetail.ValueType, CustomerStateChange.KeyType, CustomerStateChange.ValueType] {

  override def map(value: Tuple2[PreJoin.KeyType, CustomerDetail.ValueType]): Tuple2[CustomerStateChange.KeyType, CustomerStateChange.ValueType] =
    transform(value.f1, brand, ActionType.TAG)

  override def transformPayload(): String = UndecidedCustomerRegistrationMapper.tag.name

  override def operationTrigger(): String = OperationTrigger.CustomerRegistration.name


}

object UndecidedCustomerRegistrationMapper {

  val tag: Tag = Tag.CustomerUndecided

  def apply(brand: Brand) : UndecidedCustomerRegistrationMapper = new UndecidedCustomerRegistrationMapper(brand)
}
