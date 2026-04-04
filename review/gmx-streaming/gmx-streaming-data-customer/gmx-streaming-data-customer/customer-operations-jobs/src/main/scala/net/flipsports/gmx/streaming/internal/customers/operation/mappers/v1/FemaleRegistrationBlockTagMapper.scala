package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1

import net.flipsports.gmx.dataapi.internal.customers.operations.ActionType
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.internal.customers.operation.Types.{CustomerDetail, CustomerStateChange, PreJoin}
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.{OperationTrigger, Tag}
import org.apache.flink.api.java.tuple.Tuple2

class FemaleRegistrationBlockTagMapper(brand: Brand) extends StateChangeTransformer
  with ConditionalMapFunction[PreJoin.KeyType, CustomerDetail.ValueType, CustomerStateChange.KeyType, CustomerStateChange.ValueType] {

  override def map(value: Tuple2[PreJoin.KeyType, CustomerDetail.ValueType]): Tuple2[CustomerStateChange.KeyType, CustomerStateChange.ValueType] =
    transform(value.f1, brand, ActionType.TAG)

  override def transformPayload(): String = FemaleRegistrationBlockTagMapper.tag.name

  override def operationTrigger(): String = OperationTrigger.CustomerRegistration.name

}


object FemaleRegistrationBlockTagMapper {

  val tag: Tag = Tag.FemaleCustomerBlocked

  def apply(brand: Brand): FemaleRegistrationBlockTagMapper = new FemaleRegistrationBlockTagMapper(brand)

}
