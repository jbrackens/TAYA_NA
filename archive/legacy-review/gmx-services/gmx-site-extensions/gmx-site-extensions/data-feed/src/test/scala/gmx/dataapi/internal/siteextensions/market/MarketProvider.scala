package gmx.dataapi.internal.siteextensions.market

import gmx.dataapi.internal.siteextensions.JsonUtil

object MarketProvider {
  val util = new JsonUtil()

  def fromJson(json: String): Market =
    util.fromJson[Market](json)
}
