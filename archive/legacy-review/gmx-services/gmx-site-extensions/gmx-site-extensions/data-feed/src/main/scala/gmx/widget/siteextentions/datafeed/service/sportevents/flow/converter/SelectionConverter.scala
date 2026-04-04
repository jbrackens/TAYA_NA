package gmx.widget.siteextentions.datafeed.service.sportevents.flow.converter

import scala.jdk.CollectionConverters.mapAsScalaMapConverter

import tech.argyll.video.domain.model.SelectionType

import gmx.dataapi.internal.siteextensions.SportEventUpdateKey
import gmx.dataapi.internal.siteextensions.selection.HorseRacingSelectionDetails
import gmx.dataapi.internal.siteextensions.selection.Selection
import gmx.widget.siteextentions.datafeed.service.Elements._
import gmx.widget.siteextentions.datafeed.service.sportevents.flow.converter.DictionaryConverter.mapSelectionOddsTypeEnum
import gmx.widget.siteextentions.datafeed.service.sportevents.flow.converter.DictionaryConverter.mapSelectionRunnerStatus
import gmx.widget.siteextentions.datafeed.service.sportevents.flow.converter.DictionaryConverter.mapSelectionType

object SelectionConverter {

  def mapDelete(key: SportEventUpdateKey, header: DeleteHeader): SelectionDelete =
    SelectionDelete(header, key.getId.toString)

  def mapUpdate(payload: Selection, header: UpdateHeader): SelectionUpdate = {
    val selectionType = mapSelectionType(payload.getSelectionTypeId)
    SelectionUpdate(
      header = header,
      selectionId = payload.getId.toString,
      eventId = payload.getEventId.toString,
      marketId = payload.getMarketId.toString,
      selectionIntId = payload.getSelectionIntId.toString.toInt,
      selectionType = selectionType,
      participantId = Option(payload.getParticipantId).map(_.toString),
      selectionName = payload.getSelectionName.toString,
      isDisabled = payload.getIsDisabled,
      trueOdds = payload.getTrueOdds,
      displayOdds =
        payload.getDisplayOdds.asScala.map(item => (mapSelectionOddsTypeEnum(item._1), item._2.toString)).toMap,
      details = mapSelectionDetails(payload, selectionType))
  }

  private def mapSelectionDetails(item: Selection, selectionType: SelectionType): SelectionDetailsUpdate = {
    selectionType match {
      case SelectionType.ANTE_POST | SelectionType.STARTING_PRICE | SelectionType.DAY_OF_EVENT |
          SelectionType.DAY_OF_EVENT | SelectionType.EACH_WAY =>
        val details = item.getDetails.asInstanceOf[HorseRacingSelectionDetails]
        HorseRacingSelectionDetailsUpdate(runnerStatus = mapSelectionRunnerStatus(details.getRunnerStatus))

      case _ => CompetitionSelectionDetailsUpdate()
    }
  }
}
