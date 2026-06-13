package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple

import net.flipsports.gmx.streaming.common.functions.Predicate
import net.flipsports.gmx.streaming.internal.customers.operation.Types.CustomerDetail.ValueType
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.Tag
import net.flipsports.gmx.streaming.internal.customers.operation.operation._

class CustomerHasTag(val tag: Tag) extends Predicate[ValueType] {

  override def test(customer: ValueType): Boolean = {
    val customerTags = customer.getCustomerTags().split("#")
    customerTags.contains(tag.name)
  }
}

object CustomerHasTag extends Serializable {

  def apply(tag: Tag): CustomerHasTag = new CustomerHasTag(tag)

}