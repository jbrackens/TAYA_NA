package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.segments

import net.flipsports.gmx.dataapi.internal.customers.operations.ActionType
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.internal.customers.operation.Types.JoinedCustomerDetailWithLogins.{KeyType, ValueType}
import net.flipsports.gmx.streaming.internal.customers.operation.Types.{CustomerStateChange, JoinedCustomerDetailWithLogins}
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries._
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.{ConditionalMapFunction, StateChangeTransformer}
import org.apache.flink.api.java.tuple.Tuple2

class BaseSegmentMapper(brand: Brand, segment: Segment) extends StateChangeTransformer
  with ConditionalMapFunction[JoinedCustomerDetailWithLogins.KeyType, JoinedCustomerDetailWithLogins.ValueType, CustomerStateChange.KeyType, CustomerStateChange.ValueType] {

  override def map(value: Tuple2[JoinedCustomerDetailWithLogins.KeyType, JoinedCustomerDetailWithLogins.ValueType]): Tuple2[CustomerStateChange.KeyType, CustomerStateChange.ValueType] = {
    transform(value.f1.customerDetail, brand, ActionType.TAG)
  }


  override def shouldExecute(value: Tuple2[KeyType, ValueType]): Boolean = {
    val gender = Gender(value.f1.customerDetail.getGender.toString)
    val os = OSVersion(value.f1.login.getOSName.toString)
    val registrationProduct = RegistrationProduct(value.f1.customerDetail.getRegistrationProduct.toString)
    Segment
      .matchedSegments(gender, registrationProduct, os)
      .contains(segment)
  }

  override def transformPayload(): String = segment.segmentLevel.tag.name

  override def operationTrigger(): String = OperationTrigger.CustomerRegistration.name
}

object BaseSegmentMapper {

  def apply(brand: Brand) : Seq[BaseSegmentMapper] = Seq(
    new BaseSegmentMapper(brand, Segment.One),
    new BaseSegmentMapper(brand, Segment.Two),
    new BaseSegmentMapper(brand, Segment.Three),
    new BaseSegmentMapper(brand, Segment.Four),
    new BaseSegmentMapper(brand, Segment.Five),
    new BaseSegmentMapper(brand, Segment.Six),
    new BaseSegmentMapper(brand, Segment.Seven)
  )
}