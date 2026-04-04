package gmx.dataapi.internal.customer

import net.flipsports.gmx.dataapi.internal.common.core.JsonUtil

object CustomerLoggedInWrapper {

  def fromJson(json: String): CustomerLoggedIn = new JsonUtil().fromJson(json)

  def fromJsonList(json: String): Seq[CustomerLoggedIn] = new JsonUtil().fromJsonList[CustomerLoggedIn](json)

  def toJson(value: CustomerLoggedIn): String = new JsonUtil().toJson(value)

}
