package net.flipsports.gmx.streaming.sbtech.mappers.v1

import SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1.CasinoBet
import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.BetTypeEnum
import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementStatusEnum.resolve
import net.flipsports.gmx.filtering.api.FilteredObjectData
import net.flipsports.gmx.streaming.sbtech.configs.SourceBrand
import net.flipsports.gmx.streaming.sbtech.filters.v1.CasinoBetFilter
import net.flipsports.gmx.streaming.sbtech.helpers.v1.FilteredType
import org.apache.flink.api.java.tuple.{Tuple2 => FlinkTuple}

object CasinoBetToFilteredObjectData {

  def mapIfShouldBeFiltered(bet: CasinoBet, brand: SourceBrand): Seq[FlinkTuple[String, String]] = {
    val betWithFilterReason = isntFreeBetWithCashout _ tupled stakeAfterAdjustLessThanMinimum(bet)
    val rejections = betWithFilterReason._2
    rejections
      .map(transformRejection(bet, brand))
      .map(transformRejectionKeyValue)
  }

  protected def transformRejectionKeyValue =
    (filtered: FilteredObjectData) => new FlinkTuple[String, String](s"${filtered.getBrand}_${filtered.getExternalTransactionId}_${filtered.getReason}", filtered.toString)

  protected def transformRejection(casinoBet: CasinoBet, brand: SourceBrand) = (filteredType: FilteredType) => {
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
      .setBrand(brand.id)
      .setBrandName(brand.name)
      .setComboSize(1)
      .setNumberOfBets(1)
      .setMessage(casinoBet.toString)
      .setCalculatedAmount(BigDecimal(StakeCalculator.calculate(betToStake(casinoBet), BetTypeEnum.CasinoBet)).toString)
      .build()
  }

  protected def isntFreeBetWithCashout(casinoBet: CasinoBet, result: Seq[FilteredType] = Seq()) = {
    if (!CasinoBetFilter.isNotFreeBetAndItsSettled(casinoBet))
      (casinoBet, result :+ (FilteredType.NotFreebetAndNotSettled))
    else
      (casinoBet, result)
  }

  protected def stakeAfterAdjustLessThanMinimum (casinoBet: CasinoBet, result: Seq[FilteredType] = Seq()) = {
    val stake = StakeCalculator.calculate(betToStake(casinoBet), BetTypeEnum.CasinoBet)

    if (!CasinoBetFilter.amountGreaterThanMinimalValue(stake)) {
      (casinoBet, result :+ (FilteredType.AmountLessThanMinim))
    } else
      (casinoBet, result)
  }

  protected def betToStake(bet: CasinoBet) = () =>{ BigDecimal(bet.getStake) }
}
