package net.flipsports.gmx.streaming.internal.customers.operation

import java.time.temporal.ChronoUnit

import net.flipsports.gmx.streaming.internal.customers.operation.Types.CustomerDetail.ValueType
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple.RegistrationDateIsAfter

class RegistrationDateFilterMock extends RegistrationDateIsAfter(12, ChronoUnit.HOURS) {

  override def test(customer: ValueType): Boolean = true

}
