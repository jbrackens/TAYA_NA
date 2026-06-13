package net.flipsports.gmx.streaming.sbtech.mappers.v1

import com.typesafe.scalalogging.LazyLogging
import gmx.dataapi.internal.siteextensions.SportEventUpdateType
import net.flipsports.gmx.streaming.sbtech.mappers.v1.SportEventUpdateMapper._
import net.flipsports.gmx.streaming.sbtech.{SourceTypes, SportEventsTypes, _}
import org.apache.flink.api.common.functions.MapFunction

class SportEventSelectionsUpdateMapper extends MapFunction[SourceTypes.Odds.Source, SportEventsTypes.SportEventUpdate.Source]
  with LazyLogging {

  override def map(source: SourceTypes.Odds.Source): SportEventsTypes.SportEventUpdate.Source = {
    if (source.selection.isEmpty) {
      asNull(source.id.id, SportEventUpdateType.Selection)
    } else {
      val selection = source.selection.get
      as(source.id.id, SportEventUpdateType.Selection, source.eventTimestamp) {
        val result = new SportEventsTypes.SportEventSelection.ValueType()
        result.setDetails(details(selection))
        result.setDisplayOdds(selection.getDisplayOdds)
        result.setEventId(selection.getEventId)
        result.setId(selection.getId)
        result.setIsDisabled(false)
        result.setMarketId(selection.getMarketId)
        result.setParticipantId(selection.getParticipantMapping)
        val metadata = asMap(selection.getMetadata())
        val selectionIntId = metadata.getOrDefault("idSBTech", "")
        result.setSelectionIntId(selectionIntId)
        result.setSelectionName(selection.getName)
        val selectionTypeId = metadata.getOrDefault("type", "")
        result.setSelectionTypeId(selectionTypeId)
        result.setTrueOdds(selection.getTrueOdds)
        result
      }
    }
  }

  private def details(source: SourceTypes.Selection.ValueType): SportEventsTypes.HorseRacingSelectionDetails.ValueType = {
    val result = new SportEventsTypes.HorseRacingSelectionDetails.ValueType()
    val selection = source
    val metadata = asMap(selection.getMetadata)
    result.setRunnerStatus(metadata.getOrDefault("runnerStatus", ""))
    result
  }

}


object SportEventSelectionsUpdateMapper {

  def apply(): MapFunction[SourceTypes.Odds.Source, SportEventsTypes.SportEventUpdate.Source] = new SportEventSelectionsUpdateMapper
}