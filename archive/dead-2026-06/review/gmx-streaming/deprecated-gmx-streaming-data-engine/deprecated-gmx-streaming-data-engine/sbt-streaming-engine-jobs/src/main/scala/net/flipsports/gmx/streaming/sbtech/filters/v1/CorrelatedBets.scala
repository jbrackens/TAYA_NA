package net.flipsports.gmx.streaming.sbtech.filters.v1


import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.Purchase.BetInfo
import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementStatusEnum
import com.typesafe.scalalogging.LazyLogging


class CorrelatedBets(private val bets: Seq[BetInfo]) extends LazyLogging {

  def findNotSettledBets: Seq[Long] = {

    val correlatedBets = resolveCorrelatedBets

    correlatedBets.filter { betWithChildren: (BetInfo, Seq[BetInfo]) =>
      val bet = betWithChildren._1
      val children = betWithChildren._2

      val status = SettlementStatusEnum.resolve(bet.getBetStatus)

      SettlementStatusEnum.isNotSettled(status) match {
        case true => true // main bett not settled
        case false => !isAllChildsSettled(children)
      }
    }.map(_._1.getSQLTicketID.toLong)
  }

  def isAllChildsSettled(childs: Seq[BetInfo]) = childs.filter(BetInfoFilter.isBetNotSettled).isEmpty

  private def resolveCorrelatedBets: Seq[(BetInfo, Seq[BetInfo])] = {
    val allBetsWithParentSetUp: Seq[BetInfo] = bets.filter(bet => bet.getOriginalSQLTicketID == null || bet.getOriginalSQLTicketID != 0)
    val parentsSqlTickets: Seq[Long] = allBetsWithParentSetUp.map(_.getOriginalSQLTicketID.toLong)
    val allParentBets: Seq[BetInfo] = bets.filter(bet => parentsSqlTickets.contains(bet.getSQLTicketID))

    val parentsWithChilds = allParentBets.map(mapChilds(bets))

    logger.info(s"Found CorrelatedBets ${parentsWithChilds.size}")
    parentsWithChilds
  }


  def mapChilds(bets: Seq[BetInfo]) = (betInfo: BetInfo) => {
    val sqlTicket = betInfo.getSQLTicketID
    val correlatedBets = bets.filter(bet => bet.getOriginalSQLTicketID == sqlTicket)
    (betInfo, correlatedBets)
  }
}


object CorrelatedBets {

  def apply(bets: Seq[BetInfo]) = new CorrelatedBets(bets)
}