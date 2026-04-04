package net.flipsports.gmx.streaming.sbtech.mappers.v1

import SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1.{CasinoBet, CasinoBetCustomerId}
import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.BetTypeEnum
import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementStatusEnum.resolve
import net.flipsports.gmx.filtering.api.FilteredObjectData
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.sbtech.filters.v1.CasinoBetFilter
import net.flipsports.gmx.streaming.sbtech.helpers.v1.FilteredType
import net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators.{Amount, StakeCalculator}
import org.apache.flink.api.common.functions.FlatMapFunction
import org.apache.flink.api.java.tuple.{Tuple2 => FlinkTuple}
import org.apache.flink.util.Collector

class CasinoBetToFilteredObjectData(brand: Brand) extends FlatMapFunction[FlinkTuple[CasinoBetCustomerId, CasinoBet], FlinkTuple[String, String]] {

  override def flatMap(bet: FlinkTuple[CasinoBetCustomerId, CasinoBet], out: Collector[FlinkTuple[String, String]]): Unit = {
    val filteredElements = mapIfShouldBeFiltered(bet.f1)
    filteredElements.foreach(out.collect)
  }

  def mapIfShouldBeFiltered(bet: CasinoBet): Seq[FlinkTuple[String, String]] = {
    val betWithFilterReason = isntFreeBetWithCashout _ tupled stakeAfterAdjustLessThanMinimum(bet)
    val rejections = betWithFilterReason._2
    rejections
      .map(transformRejection(bet))
      .map(transformRejectionKeyValue)
  }

  protected def transformRejectionKeyValue =
    (filtered: FilteredObjectData) => new FlinkTuple[String, String](s"${filtered.getBrand}_${filtered.getExternalTransactionId}_${filtered.getReason}", filtered.toString)

  protected def transformRejection(casinoBet: CasinoBet) = (filteredType: FilteredType) => {
    val betTypeEnum = BetTypeEnum.resolve(casinoBet.getBetTypeId)
    val betStatus = resolve(casinoBet.getBetStatusId)
    FilteredObjectData.newBuilder()
      .setBetStatus(casinoBet.getBetStatusId.toLong)
      .setBetStatusName(betStatus.name())
      .setBetType(betTypeEnum.getId.longValue())
      .setBetTypeName(betTypeEnum.getDescription)
      .setReason(filteredType.code)
      .setAdditionalMessage(filteredType.description)
      .setExternalTransactionId(casinoBet.getBetID.toString)
      .setExternalUserId(casinoBet.getCustomerID.toString)
      .setBetKind("CasinoBet")
      .setBrand(brand.sourceBrand.id)
      .setBrandName(brand.sourceBrand.name)
      .setComboSize(1)
      .setNumberOfBets(1)
      .setMessage(casinoBet.toString)
      .setCalculatedAmount(StakeCalculator().calculate(betToStake(casinoBet), BetTypeEnum.CasinoBet).toString)
      .build()
  }

  protected def isntFreeBetWithCashout(casinoBet: CasinoBet, result: Seq[FilteredType] = Seq()) = {
    if (!CasinoBetFilter.isNotFreeBetAndItsSettled(casinoBet))
      (casinoBet, result :+ (FilteredType.NotFreebetAndNotSettled))
    else
      (casinoBet, result)
  }

  protected def stakeAfterAdjustLessThanMinimum (casinoBet: CasinoBet, result: Seq[FilteredType] = Seq()) = {
    val stake = StakeCalculator().calculate(betToStake(casinoBet), BetTypeEnum.CasinoBet).asDouble()

    if (!CasinoBetFilter.amountGreaterThanMinimalValue(stake)) {
      (casinoBet, result :+ (FilteredType.AmountLessThanMinim))
    } else
      (casinoBet, result)
  }

  protected def betToStake(bet: CasinoBet): Amount = Amount(bet.getStake)
}
