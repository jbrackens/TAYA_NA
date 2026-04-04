package net.flipsports.gmx.dataapi.internal.customers.operations

import net.flipsports.gmx.dataapi.internal.datalake.customer.JsonUtil

object CustomerActionsWrapper {

  def fromJson(json: String): CustomerAction = new JsonUtil().fromJson(json)

  def fromJsonList(json: String): Seq[CustomerAction] = new JsonUtil().fromJsonList[CustomerAction](json)

  def toJson(value: CustomerAction) = new JsonUtil().toJson(value)

}
