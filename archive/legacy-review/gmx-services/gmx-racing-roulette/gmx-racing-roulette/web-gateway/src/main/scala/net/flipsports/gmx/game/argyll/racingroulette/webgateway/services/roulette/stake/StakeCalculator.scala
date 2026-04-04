package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.stake

import akka.event.LoggingAdapter
import net.flipsports.gmx.common.odds.{OddsConverter, ScaledDecimal}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Response.Participant
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.SelectionStatus.Active

import scala.util.Try

trait StakeCalculator extends OddsConverter {

  val MINIMUM_STAKE = 0.05

  def logger: LoggingAdapter

  /**
   * All calculations are made on Long types with defined precision
   */
  def distributeStake(stake: Double, selections: Seq[Participant]): Try[StakeDistribution] = {
    Try[StakeDistribution]({
      val activeSelections = active(selections)

      if (activeSelections.isEmpty) {
        return Try(buildEmpty())
      }

      val scaledStake: ScaledDecimal = MONEY.scaleToLong(stake)

      val scaledPercentage: Seq[ScaledDecimal] = activeSelections.map(item => {
        val scaledOdds: ScaledDecimal = FRACTIONAL.scaleToLong(item.trueOdds)
        fractionalToPercentage(scaledOdds)
      })
      val scaledPercentageCombined: ScaledDecimal = scaledPercentage.sum
      val scaledTrueOddsCombined: ScaledDecimal = percentageToFractional(scaledPercentageCombined)
      val scaledReturnCombined: ScaledDecimal = scaledTrueOddsCombined * scaledStake

      val stakeDistribution = activeSelections.map(item => {
        val scaledOdds: ScaledDecimal = FRACTIONAL.scaleToLong(item.trueOdds)
        createSelectionStake(item, divideScaledDecimals(scaledReturnCombined, scaledOdds))
      })

      val stakeAdjusted = redistributeRemainingStake(stake, stakeDistribution)
      buildReturn(stakeAdjusted)
    })
  }

  private def active(selections: Seq[Participant]): Seq[Participant] =
    selections.filter(_.status == Active)

  private def redistributeRemainingStake(stake: Double, stakeDistribution: Seq[SelectionStake]): Seq[SelectionStake] = {
    val sortedStakeDesc = stakeDistribution.sortBy(_.singleStake).reverse
    if (logger.isDebugEnabled) {
      logger.debug("Calculated RAW result:" + describeSelections(sortedStakeDesc))
    }

    val splitByStakeSelections = sortedStakeDesc.partition(_.singleStake < MINIMUM_STAKE)
    val increasedSelections: Seq[SelectionStake] = increaseToMinimumBet(splitByStakeSelections._1)
    val validSelections = adjustLowestOdds(splitByStakeSelections._2, increasedSelections, stake)

    val result = validSelections ++ increasedSelections

    if (logger.isDebugEnabled) {
      logger.debug("Calculated ADJUSTED result:" + describeSelections(result))
    }
    result
  }

  protected def describeSelections(sortedStake: Seq[SelectionStake]) = {
    sortedStake.map(stake => s"${stake.participant.describe()} stake ${stake.singleStake} return ${stake.singleReturn}").mkString(System.lineSeparator())
  }

  private def increaseToMinimumBet(tooLowStakeSelections: Seq[SelectionStake]) = {
    tooLowStakeSelections.map(tooLowStake => {
      if (logger.isDebugEnabled) {
        logger.debug(s"Stake calculated for selection ${tooLowStake.participant.describe()} is too low, calculated: ${tooLowStake.singleStake} minimum: $MINIMUM_STAKE")
      }
      createSelectionStake(tooLowStake.participant, MONEY.scaleToLong(MINIMUM_STAKE))
    })
  }

  private def adjustLowestOdds(validStakeSelections: Seq[SelectionStake], increasedSelections: Seq[SelectionStake], stake: Double) = {
    val lowestOddsSelection = validStakeSelections.head

    val sumStake = increasedSelections.map(_.singleStake).sum + validStakeSelections.map(_.singleStake).sum
    val adjustedLowestOdds = createSelectionStake(lowestOddsSelection.participant, MONEY.scaleToLong(lowestOddsSelection.singleStake + stake - sumStake))

    adjustedLowestOdds +: validStakeSelections.tail
  }

  protected def createSelectionStake(participant: Participant, scaledSingleStake: ScaledDecimal) = {
    val singleReturn = scaledSingleStake * participant.trueOdds
    SelectionStake(participant, MONEY.scaleToDouble(scaledSingleStake), MONEY.scaleToDouble(singleReturn.longValue()))
  }

  private def buildReturn(stakeDistribution: Seq[SelectionStake]): StakeDistribution = {
    StakeDistribution(
      stakeDistribution,
      stakeDistribution.map(_.singleReturn).min
    )
  }

  private def buildEmpty(): StakeDistribution =
    StakeDistribution(Seq(), 0)
}

case class StakeDistribution(selections: Seq[SelectionStake], potentialReturn: Double)

case class SelectionStake(participant: Participant, singleStake: Double, singleReturn: Double)
