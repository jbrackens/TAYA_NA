package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple

import net.flipsports.gmx.streaming.common.functions.Predicate
import net.flipsports.gmx.streaming.internal.customers.operation.Types.CustomerDetail.ValueType
import net.flipsports.gmx.streaming.internal.customers.operation.operation._

class CustomerHasNoAffiliatesTag extends Predicate[ValueType] {

  override def test(customer: ValueType): Boolean =
    customer.getAffiliateTag == null || customer.getAffiliateTag.trim.isEmpty

}

object CustomerHasNoAffiliatesTag {

  def apply(): CustomerHasNoAffiliatesTag = new CustomerHasNoAffiliatesTag()
}
