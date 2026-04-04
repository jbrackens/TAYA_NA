package net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators.bettypemappers

import net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators.Amount
import net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators.bettypemappers.BetTypeMapper.Multiplier
import net.flipsports.gmx.streaming.sbtech.model.Event

protected class StandardStakeMultiplier extends BetTypeMapper[Multiplier] {

  def singletBet(): Amount = Amount(0.0005)

  def casinoBet(events: Seq[Event]): Amount = Amount(0.0005)

  def systemBet(): Amount = Amount(0.005)

  def qaBetSameAsSingle(): Multiplier = Amount(0.0005)

  def unresolved(): Amount = Amount.ZERO

  def default(): Amount = Amount(0.0025)

  def comboBetSingle(): Amount = Amount(0.0005)

  def comboBetDouble(): Amount = Amount(0.005)

  def comboBetTreble(): Amount = Amount(0.0175)

  def comboBetFourFold(): Amount = Amount(0.025)

  def multiFoldBet(): Amount = Amount(0.035)

  def comboBetSkip(): Multiplier = Amount.ZERO
}
