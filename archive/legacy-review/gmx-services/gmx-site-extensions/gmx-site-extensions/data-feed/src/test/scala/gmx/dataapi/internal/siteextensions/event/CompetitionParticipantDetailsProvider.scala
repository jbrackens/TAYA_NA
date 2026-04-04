package gmx.dataapi.internal.siteextensions.event

import gmx.dataapi.internal.siteextensions.JsonUtil

object CompetitionParticipantDetailsProvider {
  val util = new JsonUtil()

  def fromJson(json: String): CompetitionParticipantDetails =
    util.fromJson[CompetitionParticipantDetails](json)
}
