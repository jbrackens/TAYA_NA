package gmx.widget.siteextentions.datafeed.service.sportevents.flow.converter

import gmx.dataapi.internal.siteextensions.SportEventUpdateKey
import gmx.dataapi.internal.siteextensions.market.Market
import gmx.widget.siteextentions.datafeed.service.Elements.DeleteHeader
import gmx.widget.siteextentions.datafeed.service.Elements.MarketDelete
import gmx.widget.siteextentions.datafeed.service.Elements.MarketUpdate
import gmx.widget.siteextentions.datafeed.service.Elements.UpdateHeader
import gmx.widget.siteextentions.datafeed.service.sportevents.flow.converter.DictionaryConverter.mapMarketType

object MarketConverter {

  def mapDelete(key: SportEventUpdateKey, header: DeleteHeader): MarketDelete =
    MarketDelete(header, key.getId.toString)

  def mapUpdate(payload: Market, header: UpdateHeader): MarketUpdate =
    MarketUpdate(
      header = header,
      marketId = payload.getId.toString,
      eventId = payload.getEventId.toString,
      marketType = mapMarketType(payload.getMarketTypeId),
      marketName = payload.getMarketName.toString,
      isDisabled = payload.getIsDisabled)
}
