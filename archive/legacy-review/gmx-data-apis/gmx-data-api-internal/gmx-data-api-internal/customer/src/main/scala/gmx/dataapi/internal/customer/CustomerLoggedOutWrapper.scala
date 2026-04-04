package gmx.dataapi.internal.customer

import net.flipsports.gmx.dataapi.internal.common.core.JsonUtil

object CustomerLoggedOutWrapper {

  def fromJson(json: String): CustomerLoggedOut = new JsonUtil().fromJson(json)

  def fromJsonList(json: String): Seq[CustomerLoggedOut] = new JsonUtil().fromJsonList[CustomerLoggedOut](json)

  def toJson(value: CustomerLoggedOut): String = new JsonUtil().toJson(value)

}
