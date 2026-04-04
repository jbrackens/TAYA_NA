package gmx.dataapi.internal.siteextensions.selection

import gmx.dataapi.internal.siteextensions.JsonUtil

object SelectionProvider {
  val util = new JsonUtil()

  def fromJson(json: String): Selection = {
    val result = util.fromJson[Selection](json)

    //TODO (GM-1756): JSON does not holds any information useful to deserialize automatically, need to manually handle different types
    result.setDetails(HorseRacingSelectionDetailsProvider.fromJson(util.toJson(result.getDetails)))

    result
  }
}
