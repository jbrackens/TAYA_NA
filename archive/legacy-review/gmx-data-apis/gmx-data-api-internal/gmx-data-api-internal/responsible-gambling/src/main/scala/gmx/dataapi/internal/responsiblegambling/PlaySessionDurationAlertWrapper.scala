package gmx.dataapi.internal.responsiblegambling

import net.flipsports.gmx.dataapi.internal.common.core.JsonUtil

object PlaySessionDurationAlertWrapper {

  def fromJson(json: String): PlaySessionDurationAlert = new JsonUtil().fromJson(json)

  def fromJsonList(json: String): Seq[PlaySessionDurationAlert] = new JsonUtil().fromJsonList[PlaySessionDurationAlert](json)

  def toJson(value: PlaySessionDurationAlert) = new JsonUtil().toJson(value)
}
