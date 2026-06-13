package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1

import net.flipsports.gmx.dataapi.internal.customers.operations._
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.internal.customers.operation.Types.{CustomerStateChange, JoinedCustomerDetailWithLogins}
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.{OperationTrigger, Tag}
import org.apache.flink.api.java.tuple.Tuple2

class HighValueRegistrationTagMapper(brand: Brand) extends StateChangeTransformer
  with ConditionalMapFunction[JoinedCustomerDetailWithLogins.KeyType, JoinedCustomerDetailWithLogins.ValueType, CustomerStateChange.KeyType, CustomerStateChange.ValueType] {

  override def map(value: Tuple2[JoinedCustomerDetailWithLogins.KeyType, JoinedCustomerDetailWithLogins.ValueType]): Tuple2[CustomerStateChange.KeyType, CustomerStateChange.ValueType] = {
    transform(value.f1.customerDetail, brand, ActionType.TAG)
  }

  override def transformPayload(): String = HighValueRegistrationTagMapper.tag.name

  override def operationTrigger(): String = OperationTrigger.CustomerRegistration.name
}

object HighValueRegistrationTagMapper {

  val tag: Tag = Tag.HighValue

  def apply(brand: Brand): HighValueRegistrationTagMapper = new HighValueRegistrationTagMapper(brand)
}
