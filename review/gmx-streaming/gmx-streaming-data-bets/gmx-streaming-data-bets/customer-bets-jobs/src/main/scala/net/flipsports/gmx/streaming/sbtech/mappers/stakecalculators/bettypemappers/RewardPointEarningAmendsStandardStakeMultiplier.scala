package net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators.bettypemappers

import net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators.Amount
import net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators.bettypemappers.BetTypeMapper.Multiplier
import net.flipsports.gmx.streaming.sbtech.model.Event

protected class RewardPointEarningAmendsStandardStakeMultiplier extends BetTypeMapper[Multiplier] {

  val standardStakeMultiplier = new StandardStakeMultiplier

  def singletBet(): Amount = Amount.ZERO

  def casinoBet(events: Seq[Event]): Amount = Amount.ZERO

  def systemBet(): Amount = Amount.ZERO

  def unresolved(): Amount = Amount.ZERO

  def qaBetSameAsSingle(): Amount =  Amount.ZERO

  def default(): Amount = Amount(0.0025) - standardStakeMultiplier.default()

  def comboBetSingle(): Amount = Amount.ZERO

  def comboBetDouble(): Amount = Amount.ZERO

  def comboBetTreble(): Amount = Amount(0.02) - standardStakeMultiplier.comboBetTreble()

  def comboBetFourFold(): Amount = Amount(0.0500) - standardStakeMultiplier.comboBetFourFold()

  def multiFoldBet(): Amount = Amount(0.1000) - standardStakeMultiplier.multiFoldBet()

  override protected def comboBetSkip(): Multiplier = Amount.ZERO

}
