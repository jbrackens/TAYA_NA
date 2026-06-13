package net.flipsports.gmx.streaming.sbtech.mappers.v1

import com.typesafe.scalalogging.LazyLogging
import gmx.dataapi.internal.siteextensions.SportEventUpdateType
import net.flipsports.gmx.streaming.sbtech.mappers.v1.SportEventUpdateMapper._
import net.flipsports.gmx.streaming.sbtech.{SourceTypes, SportEventsTypes, _}
import org.apache.flink.api.common.functions.MapFunction

class SportEventMarketsUpdateMapper extends MapFunction[SourceTypes.Odds.Source, SportEventsTypes.SportEventUpdate.Source]
  with LazyLogging {

  override def map(source: SourceTypes.Odds.Source): SportEventsTypes.SportEventUpdate.Source = {
    if (source.market.isEmpty) {
      asNull(source.id.id, SportEventUpdateType.Market)
    } else {
      val market = source.market.get
      as(market.getId, SportEventUpdateType.Market, source.eventTimestamp) {
        val result = new SportEventsTypes.SportEventMarket.ValueType()

        result.setEventId(market.getEventId)
        result.setId(market.getId)
        if (market.getMarketType != null) {
          result.setMarketTypeId(market.getMarketType.getId)
          result.setMarketTypeName(market.getMarketType.getName)
        }
        result.setMarketName(market.getName)
        result.setIsDisabled(market.getIsSuspended)
        result
      }
    }
  }

}


object SportEventMarketsUpdateMapper {


  def apply(): MapFunction[SourceTypes.Odds.Source, SportEventsTypes.SportEventUpdate.Source] = new SportEventMarketsUpdateMapper()

}