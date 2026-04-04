package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple

import net.flipsports.gmx.streaming.common.functions.Predicate
import net.flipsports.gmx.streaming.internal.customers.operation.Types.CustomerDetail.ValueType
import net.flipsports.gmx.streaming.internal.customers.operation.operation._

class CustomerHasNoTag extends Predicate[ValueType]{

  override def test(customer: ValueType): Boolean = customer.getCustomerTags() == null || customer.getCustomerTags().trim.isEmpty

}

object CustomerHasNoTag {

  def apply(): CustomerHasNoTag = new CustomerHasNoTag()
}
