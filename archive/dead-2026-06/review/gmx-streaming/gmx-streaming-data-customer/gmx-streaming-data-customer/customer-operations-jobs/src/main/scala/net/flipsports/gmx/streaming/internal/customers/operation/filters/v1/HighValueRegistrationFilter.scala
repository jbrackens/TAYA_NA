package net.flipsports.gmx.streaming.internal.customers.operation.filters.v1

import net.flipsports.gmx.streaming.internal.customers.operation.Types.JoinedCustomerDetailWithLogins
import net.flipsports.gmx.streaming.internal.customers.operation.Types.JoinedCustomerDetailWithLogins.{KeyType, ValueType}
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple.CustomerInAnySegment
import org.apache.flink.api.common.functions.FilterFunction
import org.apache.flink.api.java.tuple.Tuple2

class HighValueRegistrationFilter extends FilterFunction[Tuple2[JoinedCustomerDetailWithLogins.KeyType, JoinedCustomerDetailWithLogins.ValueType]]  {

  val customerMatchAnySegment = CustomerInAnySegment()

  override def filter(value: Tuple2[KeyType, ValueType]): Boolean = {
    customerMatchAnySegment.test(value.f1)
  }


}


object HighValueRegistrationFilter {


  def apply(): FilterFunction[Tuple2[JoinedCustomerDetailWithLogins.KeyType, JoinedCustomerDetailWithLogins.ValueType]] = new HighValueRegistrationFilter()
}