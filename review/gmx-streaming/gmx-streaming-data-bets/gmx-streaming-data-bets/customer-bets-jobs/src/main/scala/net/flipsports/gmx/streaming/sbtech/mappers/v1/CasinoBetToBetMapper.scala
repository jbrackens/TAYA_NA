package net.flipsports.gmx.streaming.sbtech.mappers.v1

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.{BetTypeEnum, SettlementStatusEnum}
import net.flipsports.gmx.streaming.sbtech.Types
import net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators.Amount
import net.flipsports.gmx.streaming.sbtech.model.{BetKind, Event}
import org.apache.flink.api.java.tuple.{Tuple2 => FlinkTuple2}

object CasinoBetToBetMapper {

  def map:(Types.CasinoBets.Source) => Types.Bets.Source = { source =>
    val bet = source.f1
    val key = new Types.Bets.KeyType(source.f1.getCustomerID.toString)

    val game = Event(
      eventName = bet.getGameName.toString,
      eventNameId = bet.getGameNameId,
      eventType = bet.getGameType.toString,
      eventTypeId = bet.getGameTypeId
    )

    val value = new Types.Bets.ValueType(
      betKind = BetKind.CasinoBet,
      id = bet.getBetID.toString,
      creationDate = bet.getCreationDate,
      settlementStatus = SettlementStatusEnum.resolve(bet.getBetStatusId),
      betType = BetTypeEnum.CasinoBet,
      stake = Amount(bet.getStake),
      numberOfBets = 1,
      comboSize = 1,
      events = Seq(game)
    )
    new FlinkTuple2(key, value)
  }
}
