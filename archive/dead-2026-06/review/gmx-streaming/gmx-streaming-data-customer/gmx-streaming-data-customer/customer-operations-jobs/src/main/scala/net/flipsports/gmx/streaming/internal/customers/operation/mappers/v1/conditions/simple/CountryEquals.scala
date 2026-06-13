package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple

import net.flipsports.gmx.streaming.common.functions.Predicate
import net.flipsports.gmx.streaming.internal.customers.operation.Types.CustomerDetail.ValueType
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.CountryCode
import net.flipsports.gmx.streaming.internal.customers.operation.operation._

class CountryEquals(val country: CountryCode) extends Predicate[ValueType] {

  override def test(customer: ValueType): Boolean = country.codeMatch(customer.getCountryCode)

}

object CountryEquals extends Serializable {

  def canada(): CountryEquals = new CountryEquals(CountryCode.Canada)

  def ireland(): CountryEquals = new CountryEquals(CountryCode.Ireland)

}
