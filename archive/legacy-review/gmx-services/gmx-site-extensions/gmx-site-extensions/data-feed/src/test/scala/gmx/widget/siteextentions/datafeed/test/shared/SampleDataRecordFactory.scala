package gmx.widget.siteextentions.datafeed.test.shared

import java.util
import java.util.Collections
import java.util.UUID

import scala.jdk.CollectionConverters._

import gmx.common.internal.partner.sbtech.cons.SBTechMarketType
import gmx.common.internal.partner.sbtech.cons.SBTechSportType
import gmx.dataapi.internal.siteextensions.SportEventUpdate
import gmx.dataapi.internal.siteextensions.SportEventUpdateKey
import gmx.dataapi.internal.siteextensions.SportEventUpdateType
import gmx.dataapi.internal.siteextensions.event.Event
import gmx.dataapi.internal.siteextensions.market.Market
import gmx.dataapi.internal.siteextensions.selection.Selection
import gmx.dataapi.internal.siteextensions.selection.SelectionOddsTypeEnum
import gmx.widget.siteextentions.datafeed.service.sportevents.source.DataUpdate

object SampleDataRecordFactory {

  def sampleEventUpdate(
      eventId: String = DataGenerator.generateId,
      sportId: String = DataGenerator.generateSBTechSportType.sbtechId,
      eventType: String = DataGenerator.generateEventType.name(),
      eventStatus: String = DataGenerator.generateEventStatus.name()): DataUpdate = {
    DataUpdate(
      new SportEventUpdateKey(SportEventUpdateType.Event, eventId),
      new SportEventUpdate(
        UUID.randomUUID().toString,
        1,
        1,
        new Event(
          eventId,
          sportId,
          SBTechSportType.findById(sportId).map(_.sportType.getDbValue).getOrElse(""),
          "225",
          "GB",
          "United Kingdom",
          "11156",
          "Premiere League",
          eventType,
          "teamA vs teamB",
          213123,
          eventStatus,
          false,
          false,
          Collections.emptyList())))
  }

  def sampleMarketUpdate(
      eventId: String = DataGenerator.generateId,
      marketId: String = DataGenerator.generateId,
      marketTypeId: String = DataGenerator.generateSBTechMarketType.sbtechId): DataUpdate = {
    DataUpdate(
      new SportEventUpdateKey(SportEventUpdateType.Market, marketId),
      new SportEventUpdate(
        UUID.randomUUID().toString,
        1,
        1,
        new Market(
          marketId,
          eventId,
          marketTypeId,
          SBTechMarketType.findById(marketTypeId).map(_.marketType.getDbValue).getOrElse(""),
          DataGenerator.generateMarketName,
          DataGenerator.generateBool)))
  }

  def sampleSelectionUpdate(
      eventId: String = DataGenerator.generateId,
      marketId: String = DataGenerator.generateId,
      selectionId: String = DataGenerator.generateId,
      selectionTypeId: String = DataGenerator.generateSBTechSelectionType.sbtechId): DataUpdate = {
    val odds = DataGenerator.generateOdds

    val trueOdds = odds(SelectionOddsTypeEnum.Decimal).toDouble
    val displayOdds: util.Map[CharSequence, CharSequence] =
      odds.map(tuple => (tuple._1.toString.asInstanceOf[CharSequence], tuple._2.asInstanceOf[CharSequence])).asJava
    DataUpdate(
      new SportEventUpdateKey(SportEventUpdateType.Selection, selectionId),
      new SportEventUpdate(
        UUID.randomUUID().toString,
        1,
        1,
        new Selection(
          selectionId,
          marketId,
          eventId,
          DataGenerator.generateId,
          selectionTypeId,
          DataGenerator.generateId,
          DataGenerator.generateSelectionName,
          DataGenerator.generateBool,
          trueOdds,
          displayOdds,
          None.orNull)))
  }
}
