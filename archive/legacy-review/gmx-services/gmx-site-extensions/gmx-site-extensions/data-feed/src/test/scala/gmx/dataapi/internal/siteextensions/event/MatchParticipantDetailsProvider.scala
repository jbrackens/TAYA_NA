package gmx.dataapi.internal.siteextensions.event

import gmx.dataapi.internal.siteextensions.JsonUtil

object MatchParticipantDetailsProvider {
  val util = new JsonUtil()

  def fromJson(json: String): MatchParticipantDetails =
    util.fromJson[MatchParticipantDetails](json)
}
