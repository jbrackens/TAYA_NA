package gmx.dataapi.internal.responsiblegambling

import net.flipsports.gmx.dataapi.internal.common.core.JsonUtil

object TimeoutAlertWrapper {

  def fromJson(json: String): TimeoutFrequencyAlert = new JsonUtil().fromJson(json)

  def fromJsonList(json: String): Seq[TimeoutFrequencyAlert] = new JsonUtil().fromJsonList[TimeoutFrequencyAlert](json)

  def toJson(value: TimeoutFrequencyAlert) = new JsonUtil().toJson(value)
}
