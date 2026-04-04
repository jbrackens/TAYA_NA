package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple

import java.time.Instant
import java.time.temporal.{ChronoUnit, TemporalUnit}

import net.flipsports.gmx.streaming.common.functions.Predicate
import net.flipsports.gmx.streaming.internal.customers.operation.Types.CustomerDetail.ValueType

class RegistrationDateIsAfter(retentionHours: Int, unit: TemporalUnit) extends Predicate[ValueType] {

  override def test(customer: ValueType): Boolean = {
    val retention = Instant.now().minus(retentionHours, ChronoUnit.HOURS)
    Instant.ofEpochMilli(customer.getRegistrationDate).isAfter(retention)
  }

}

object RegistrationDateIsAfter extends Serializable {

  val retentionHours = 12

  val freshRegistration = 10

  def isRegistrationYoungerThan12Hours(): RegistrationDateIsAfter = new RegistrationDateIsAfter(retentionHours, ChronoUnit.HOURS)

  def isRegistrationYoungerThan10Minutes(): RegistrationDateIsAfter = new RegistrationDateIsAfter(freshRegistration, ChronoUnit.MINUTES)
}