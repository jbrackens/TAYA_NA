package gmx.dataapi.internal.customer

import net.flipsports.gmx.dataapi.internal.common.core.JsonUtil

object CustomerMessageKeyWrapper {

  def fromJson(json: String): CustomerMessageKey = new JsonUtil().fromJson(json)

  def fromJsonList(json: String): Seq[CustomerMessageKey] = new JsonUtil().fromJsonList[CustomerMessageKey](json)

  def toJson(value: CustomerMessageKey): String = new JsonUtil().toJson(value)

}
