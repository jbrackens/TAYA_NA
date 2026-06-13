package net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators.bettypemappers

import net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators.Amount
import net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators.bettypemappers.BetTypeMapper.LowerOddsLimit
import net.flipsports.gmx.streaming.sbtech.model.Event

protected class LowerOddsLimitsResolver extends BetTypeMapper[LowerOddsLimit] {

  val standardStakeMultiplier = new StandardStakeMultiplier

  def noLimit(): Amount = Amount(Double.MinValue)

  def singletBet(): Amount = noLimit

  def casinoBet(events: Seq[Event]): Amount = noLimit

  def systemBet(): Amount = noLimit

  def qaBetSameAsSingle(): Amount = noLimit

  def unresolved(): Amount = noLimit

  def default(): Amount = noLimit

  def comboBetSingle(): Amount = noLimit

  def comboBetDouble(): Amount = Amount(-250)

  def comboBetTreble(): Amount = Amount(-250)

  def comboBetFourFold(): Amount = Amount(-250)

  def multiFoldBet(): Amount = Amount(-167)

  def comboBetSkip(): LowerOddsLimit = noLimit()


}
