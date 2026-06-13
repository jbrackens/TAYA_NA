package net.flipsports.gmx.streaming.sbtech.filters.v1

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.Purchase.{BetInfo, BetSelectionInfo}
import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementData
import com.typesafe.scalalogging.LazyLogging

import scala.collection.JavaConverters._

class CorrelatedSelections(private val settlementData: SettlementData) extends LazyLogging {

  final val selections = getSelectionMapping

  def getSelectionMapping: Map[Long, BetSelectionInfo] = {
    val selections = settlementData.getPurchase.getSelections.asScala
    selections
      .map {selection => (selection.getSelectionID.toLong, selection)}
      .toMap
  }

  def getLeagueIdsFor(bet: BetInfo): Seq[Long] = {
    val selectionMapped = bet.getSelectionsMapped.asScala
    selectionMapped.map { selectionMapping =>
      val selectionId = selectionMapping.getSelectionID.toLong
      selections.get(selectionId) match {
        case Some(selection) => selection.getLeagueID.toLong
        case None => -1
      }
    }
  }

  def getInLiveFor(bet: BetInfo): Seq[Boolean] = {
    val selectionMapped = bet.getSelectionsMapped.asScala
    selectionMapped.map { selectionMapping =>
      val selectionId = selectionMapping.getSelectionID.toLong
      selections.get(selectionId) match  {
        case Some(selection) => selection.getIsLive.booleanValue()
        case None => false
      }
    }
  }

}


