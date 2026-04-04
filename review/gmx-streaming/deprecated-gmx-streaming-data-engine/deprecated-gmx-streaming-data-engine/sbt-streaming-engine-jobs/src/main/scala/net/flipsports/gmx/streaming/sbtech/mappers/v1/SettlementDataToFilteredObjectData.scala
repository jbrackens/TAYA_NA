package net.flipsports.gmx.streaming.sbtech.mappers.v1

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.Purchase.BetInfo
import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.{BetTypeEnum, SettlementData, SettlementStatusEnum}
import net.flipsports.gmx.filtering.api.FilteredObjectData
import net.flipsports.gmx.streaming.sbtech.configs.SourceBrand
import net.flipsports.gmx.streaming.sbtech.filters.v1.{BetInfoFilter, CorrelatedBets, SettlementDataFilter}
import net.flipsports.gmx.streaming.sbtech.helpers.v1.FilteredType
import org.apache.flink.api.java.tuple.{Tuple2 => FlinkTuple}

import scala.collection.JavaConverters._


object SettlementDataToFilteredObjectData {

  def mapIfShouldBeFiltered(bet: SettlementData, brand: SourceBrand): Seq[FlinkTuple[String, String]] = {

    val bets = bet.getPurchase.getBets.asScala
    val correlatedBets = CorrelatedBets.apply(bets)
    val correlatedBetsNotSettled: Seq[Long] = correlatedBets.findNotSettledBets

    val customerId = bet.getPurchase.getCurrencyID.toString

    val freeBets = bets
      .filter(SettlementDataFilter.isFreeBet)
      .map(transformRejection(bet, customerId, brand, FilteredType.ItsFreeBet))

    val betsWithOriginalTicketId =  bets
      .filter(SettlementDataFilter.isNotFreeBet)
      .filterNot(SettlementDataFilter.hasOriginalSqlTicketIdEmpty)
      .map(transformRejection(bet, customerId, brand, FilteredType.HasOriginalSqlTicketIdNotEmpty))

    val partialBetsNotSettled = bets
      .filter(SettlementDataFilter.isNotFreeBet)
      .filter(SettlementDataFilter.hasOriginalSqlTicketIdEmpty)
      .filterNot(bet => SettlementDataFilter.betIdNotIn(bet, correlatedBetsNotSettled))
      .map(transformRejection(bet, customerId, brand, FilteredType.PartialBetsNotSettled))

    val notSettled = bets
      .filter(SettlementDataFilter.isNotFreeBet)
      .filter(SettlementDataFilter.hasOriginalSqlTicketIdEmpty)
      .filter(bet => SettlementDataFilter.betIdNotIn(bet, correlatedBetsNotSettled))
      .filterNot(BetInfoFilter.isOpened)
      .filterNot(BetInfoFilter.isBetSettled)
      .map(transformRejection(bet, customerId, brand, FilteredType.BetisNotSettled))

    val betsWithAmountLowerThanMinimum = bets
      .filter(SettlementDataFilter.isNotFreeBet)
      .filter(SettlementDataFilter.hasOriginalSqlTicketIdEmpty)
      .filter(bet => SettlementDataFilter.betIdNotIn(bet, correlatedBetsNotSettled))
      .filter(BetInfoFilter.isBetSettled)
      .foldLeft(Seq[(BetInfo, Double)]()) { (result, bet) => {
        result :+ Tuple2(bet, SettlementDataToTopupData.calculateFromBet(bet))
      }}
      .filterNot(i => SettlementDataFilter.amountGreaterThanMinimalValue(i._2))
      .map(_._1)
      .map(transformRejection(bet, customerId, brand, FilteredType.AmountLessThanMinim))

    (freeBets ++ betsWithOriginalTicketId ++ partialBetsNotSettled ++ notSettled ++ betsWithAmountLowerThanMinimum)
      .map(transformRejectionKeyValue)
  }

  def transformRejection(parent: SettlementData, customerId: String, brand: SourceBrand, filteredType: FilteredType) = (bet: BetInfo) =>  {
    val betTypeEnum = BetTypeEnum.resolve(bet.getBetTypeID)
    val betStatus = SettlementStatusEnum.resolve(bet.getBetStatus)
    FilteredObjectData.newBuilder()
      .setBetStatus(bet.getBetStatus.toLong)
      .setBetStatusName(betStatus.name())
      .setBetType(bet.getBetTypeID.toLong)
      .setBetTypeName(betTypeEnum.getDescription)
      .setReason(filteredType.code)
      .setAdditionalMessage(filteredType.description)
      .setExternalTransactionId(bet.getSQLTicketID.toString)
      .setExternalUserId(customerId)
      .setBrand(brand.id)
      .setBrandName(brand.name)
      .setComboSize(bet.getComboSize.longValue())
      .setNumberOfBets(bet.getNumberOfBets.longValue())
      .setMessage(parent.toString)
      .setBetKind("SportBets")
      .setCalculatedAmount(BigDecimal(SettlementDataToTopupData.calculateFromBet(bet)).toString)
      .build()
  }

  protected def transformRejectionKeyValue =
    (filtered: FilteredObjectData) => new FlinkTuple[String, String](s"${filtered.getBrand}_${filtered.getExternalTransactionId}_${filtered.getReason}", filtered.toString)


}
