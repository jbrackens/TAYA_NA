package net.flipsports.gmx.streaming.sbtech.mappers.v1

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementStatusEnum
import net.flipsports.gmx.streaming.sbtech.Types
import net.flipsports.gmx.streaming.sbtech.filters.v1.SettlementDataFilter
import net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators.{Amount, CommonTransformation}
import net.flipsports.gmx.streaming.sbtech.model.{BetKind, Event, Odds}
import org.apache.flink.api.common.functions.FlatMapFunction
import org.apache.flink.api.java.tuple.{Tuple2 => FlinkTuple}

import scala.collection.JavaConverters._
object SportBetsToBetMapper {

  def map: FlatMapFunction[Types.SportBets.Source, Types.Bets.Source] = { (record, collector)   =>
    val bets = SettlementDataFilter
      .filterAndExtractBets(record.f1)
      .map(bet => asBet(bet, record.f1))

    val customerId = new Types.Bets.KeyType(record.f1.getPurchase.getCustomer.getCustomerID.toString)
    bets
      .map(_.copy(correlatedBets = bets))
      .map(new FlinkTuple(customerId, _))
      .map(collector.collect)
  }

  def transformOddsAndEvents(bet: Types.BetInfo.ValueType, settlementData: Types.SportBets.ValueType): Seq[(Odds, Event)] = {
    val sectionIds = bet.getSelectionsMapped.asScala.map(_.getSelectionID)
    val selections = settlementData.getPurchase.getSelections.asScala.filter(s => sectionIds.contains(s.getSelectionID))
    selections.map( selection =>
      (Odds(
        lineId = selection.getLineID.toString,
        odds = Amount(selection.getDBOdds)
      ), Event(
        eventName = Option(selection.getEventName()).getOrElse("").toString,
        eventNameId = selection.getEventID(),
        eventTypeId = selection.getEventTypeID(),
        eventType = Option(selection.getEventTypeName()).getOrElse("").toString
      ))
    )
  }



  val asBet = (bet: Types.BetInfo.ValueType, settlementData: Types.SportBets.ValueType) => {
    val betType = CommonTransformation.toBetType(bet)
    val betToStake = CommonTransformation.toBetToStake(bet)
    val betStatus = SettlementStatusEnum.resolve(bet.getBetStatus)
    val odddsAndevents = transformOddsAndEvents(bet, settlementData)
    val odds = odddsAndevents.map(_._1)
    val events = odddsAndevents.map(_._2)
    new Types.Bets.ValueType(
      betKind = BetKind.SportBet,
      id = bet.getSQLTicketID.toString,
      creationDate = settlementData.getPurchase.getCreationDate,
      settlementStatus = betStatus,
      betType = betType,
      odds = odds,
      events = events,
      stake = betToStake,
      numberOfBets = bet.getNumberOfBets,
      comboSize = bet.getComboSize
    )
  }

}
