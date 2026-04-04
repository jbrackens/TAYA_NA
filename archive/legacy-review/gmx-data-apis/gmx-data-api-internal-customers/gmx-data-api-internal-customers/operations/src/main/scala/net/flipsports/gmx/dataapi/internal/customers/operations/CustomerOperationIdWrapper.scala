package net.flipsports.gmx.dataapi.internal.customers.operations

import net.flipsports.gmx.dataapi.internal.datalake.customer.JsonUtil

object CustomerOperationIdWrapper {

  def fromJson(json: String): CustomerOperationId = new JsonUtil().fromJson(json)

  def fromJsonList(json: String): Seq[CustomerOperationId] = new JsonUtil().fromJsonList[CustomerOperationId](json)

  def toJson(value: CustomerOperationId) = new JsonUtil().toJson(value)

}
