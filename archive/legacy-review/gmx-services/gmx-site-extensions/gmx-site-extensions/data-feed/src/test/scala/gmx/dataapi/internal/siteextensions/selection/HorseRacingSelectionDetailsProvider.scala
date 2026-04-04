package gmx.dataapi.internal.siteextensions.selection

import gmx.dataapi.internal.siteextensions.JsonUtil

object HorseRacingSelectionDetailsProvider {
  val util = new JsonUtil()

  def fromJson(json: String): HorseRacingSelectionDetails =
    util.fromJson[HorseRacingSelectionDetails](json)
}
