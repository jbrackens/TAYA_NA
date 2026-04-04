package net.flipsports.gmx.streaming.internal.customers.operation.filters.v1

import net.flipsports.gmx.streaming.internal.customers.operation.Types
import net.flipsports.gmx.streaming.internal.customers.operation.Types.JoinedCustomerDetailWithLogins.{KeyType, ValueType}
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.CanadianRegistrationCanadaTagMapper
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple._
import org.apache.flink.api.common.functions.FilterFunction
import org.apache.flink.api.java.tuple.Tuple2

class CanadianRegistrationFilter extends FilterFunction[Tuple2[Types.JoinedCustomerDetailWithLogins.KeyType, Types.JoinedCustomerDetailWithLogins.ValueType]] {

  val countryEquals = CountryEquals.canada()

  val customerHasNotTag = CustomerHasTag(CanadianRegistrationCanadaTagMapper.tag).negate()

  override def filter(record: Tuple2[KeyType, ValueType]): Boolean = countryEquals.and(customerHasNotTag).test(record.f1.customerDetail)
}



object CanadianRegistrationFilter extends Serializable {

  def apply(): CanadianRegistrationFilter = new CanadianRegistrationFilter()
}



