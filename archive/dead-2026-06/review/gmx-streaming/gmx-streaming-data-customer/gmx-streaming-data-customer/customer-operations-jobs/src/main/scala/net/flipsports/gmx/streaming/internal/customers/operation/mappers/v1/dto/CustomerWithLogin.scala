package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.dto

import net.flipsports.gmx.streaming.internal.customers.operation.Types
import net.flipsports.gmx.streaming.internal.customers.operation.Types.Logins

class CustomerWithLogin(var customerDetail: Types.CustomerDetail.ValueType, var login: Logins.ValueType) extends Serializable {

  def setCustomerDetail(f1: Types.CustomerDetail.ValueType): Unit = {
    this.customerDetail = f1
  }

  def setLogin(f2: Logins.ValueType): Unit = {
    this.login = f2
  }

  private val quote = "\""

  override def toString: String = s"{ ${quote}customerDetail${quote}: ${customerDetail.toString}, ${quote}login${quote}: ${login.toString}}"

}
