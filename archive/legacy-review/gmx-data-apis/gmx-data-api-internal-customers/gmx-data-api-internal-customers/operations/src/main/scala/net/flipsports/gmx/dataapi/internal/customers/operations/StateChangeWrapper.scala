package net.flipsports.gmx.dataapi.internal.customers.operations

import net.flipsports.gmx.dataapi.internal.datalake.customer.JsonUtil

object StateChangeWrapper {

  def fromJson(json: String): StateChange = new JsonUtil().fromJson(json)

  def fromJsonList(json: String): Seq[StateChange] = new JsonUtil().fromJsonList[StateChange](json)

  def toJson(value: StateChange) = new JsonUtil().toJson(value)

}
