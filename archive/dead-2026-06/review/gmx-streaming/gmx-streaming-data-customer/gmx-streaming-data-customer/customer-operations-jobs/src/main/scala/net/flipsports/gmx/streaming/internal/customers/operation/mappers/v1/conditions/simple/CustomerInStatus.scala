package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple

import net.flipsports.gmx.streaming.common.functions.Predicate
import net.flipsports.gmx.streaming.internal.customers.operation.Types.CustomerDetail.ValueType
import net.flipsports.gmx.streaming.internal.customers.operation.operation._

class CustomerInStatus(val status: String) extends Predicate[ValueType] {

  override def test(customer: ValueType): Boolean = {
    val customerStatus = customer.getVerificationStatus.trim()
    status.equalsIgnoreCase(customerStatus)
  }

}

object CustomerInStatus extends Serializable {

  def customerIsVerified(): CustomerInStatus = new CustomerInStatus("Customer Verified")

  def customerIsNotVerified(): CustomerInStatus = new CustomerInStatus("Not Verified")
}