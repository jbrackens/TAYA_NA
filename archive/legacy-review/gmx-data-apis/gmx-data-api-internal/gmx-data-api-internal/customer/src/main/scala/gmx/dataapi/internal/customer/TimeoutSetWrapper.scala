package gmx.dataapi.internal.customer

import net.flipsports.gmx.dataapi.internal.common.core.JsonUtil

object TimeoutSetWrapper {

  def fromJson(json: String): TimeoutSet = new JsonUtil().fromJson(json)

  def fromJsonList(json: String): Seq[TimeoutSet] = new JsonUtil().fromJsonList[TimeoutSet](json)

  def toJson(value: TimeoutSet): String = new JsonUtil().toJson(value)

}
