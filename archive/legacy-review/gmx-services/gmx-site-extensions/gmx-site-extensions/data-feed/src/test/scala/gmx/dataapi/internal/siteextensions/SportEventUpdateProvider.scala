package gmx.dataapi.internal.siteextensions

import gmx.dataapi.internal.siteextensions.event.EventProvider
import gmx.dataapi.internal.siteextensions.market.MarketProvider
import gmx.dataapi.internal.siteextensions.selection.SelectionProvider

object SportEventUpdateProvider {
  val util = new JsonUtil()

  def fromJson(json: String, elemType: SportEventUpdateType): SportEventUpdate = {
    val result = util.fromJson[SportEventUpdate](json)

    //TODO (GM-1756): JSON does not holds any information useful to deserialize automatically, need to manually handle different types
    val payload = elemType match {
      case SportEventUpdateType.Event     => EventProvider.fromJson(util.toJson(result.getPayload))
      case SportEventUpdateType.Market    => MarketProvider.fromJson(util.toJson(result.getPayload))
      case SportEventUpdateType.Selection => SelectionProvider.fromJson(util.toJson(result.getPayload))
    }
    result.setPayload(payload)
    result
  }

}
