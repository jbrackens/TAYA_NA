package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple

import net.flipsports.gmx.streaming.common.functions.Predicate
import net.flipsports.gmx.streaming.internal.customers.operation.Types.CustomerDetail.ValueType
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.EmailType
import net.flipsports.gmx.streaming.internal.customers.operation.operation._

class EmailEquals(val email: EmailType) extends Predicate[ValueType] {

  override def test(customer: ValueType): Boolean =
    email.emailMatch(customer.getEmail)

}

object EmailEquals {

  def gmail(): EmailEquals = new EmailEquals(EmailType.Gmail)

  def outlook(): EmailEquals = new EmailEquals(EmailType.Outlook)

  def yahoo(): EmailEquals = new EmailEquals(EmailType.Yahoo)

}
