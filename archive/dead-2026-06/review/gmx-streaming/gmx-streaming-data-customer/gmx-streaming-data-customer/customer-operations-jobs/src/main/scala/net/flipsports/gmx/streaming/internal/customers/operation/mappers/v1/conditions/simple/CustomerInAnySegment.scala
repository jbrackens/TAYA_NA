package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple

import net.flipsports.gmx.streaming.common.functions.Predicate
import net.flipsports.gmx.streaming.internal.customers.operation.Types.JoinedCustomerDetailWithLogins.ValueType
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.{Gender, OSVersion, RegistrationProduct, Segment}
import net.flipsports.gmx.streaming.internal.customers.operation.operation._

class CustomerInAnySegment extends Predicate[ValueType] {

  override def test(value: ValueType): Boolean = {
    val gender = Gender(value.customerDetail.getGender)
    val os = OSVersion(value.login.getOSName)
    val registrationProduct = RegistrationProduct(value.customerDetail.getRegistrationProduct)
    !Segment
      .matchedSegments(gender, registrationProduct, os)
      .isEmpty
  }
}

object CustomerInAnySegment {

  def apply() = new CustomerInAnySegment()
}
