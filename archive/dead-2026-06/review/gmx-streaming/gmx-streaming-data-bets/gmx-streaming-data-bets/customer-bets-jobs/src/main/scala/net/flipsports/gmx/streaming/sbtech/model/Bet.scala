package net.flipsports.gmx.streaming.sbtech.model

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.{BetTypeEnum, SettlementStatusEnum}
import net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators.Amount


case class Bet(
  id: String,
  betKind: BetKind,
  creationDate: Long,
  settlementStatus: SettlementStatusEnum,
  betType: BetTypeEnum,
  stake: Amount,
  numberOfBets: Int = 1,
  comboSize: Int = 1,
  correlatedBets: Seq[Bet] = Seq(),
  odds: Seq[Odds] = Seq(),
  events: Seq[Event] = Seq()
)