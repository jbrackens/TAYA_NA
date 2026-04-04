package gmx.dataapi.internal.siteextensions.event

import gmx.dataapi.internal.siteextensions.JsonUtil

object HorseRacingParticipantDetailsProvider {
  val util = new JsonUtil()

  def fromJson(json: String): HorseRacingParticipantDetails =
    util.fromJson[HorseRacingParticipantDetails](json)
}
