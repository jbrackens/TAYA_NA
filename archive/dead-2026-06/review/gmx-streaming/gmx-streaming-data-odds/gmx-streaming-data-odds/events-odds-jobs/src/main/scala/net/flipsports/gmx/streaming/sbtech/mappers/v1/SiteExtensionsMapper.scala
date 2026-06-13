package net.flipsports.gmx.streaming.sbtech.mappers.v1

import net.flipsports.gmx.streaming.sbtech.SourceTypes.Odds
import net.flipsports.gmx.streaming.sbtech.SportEventsTypes.SportEventUpdate
import org.apache.flink.api.common.functions.MapFunction

object SiteExtensionsMapper {

  def events(): MapFunction[Odds.Source, SportEventUpdate.Source] = SportEventEventsUpdateMapper()

  def markets(): MapFunction[Odds.Source, SportEventUpdate.Source] = SportEventMarketsUpdateMapper()

  def selections(): MapFunction[Odds.Source, SportEventUpdate.Source] = SportEventSelectionsUpdateMapper()

}
