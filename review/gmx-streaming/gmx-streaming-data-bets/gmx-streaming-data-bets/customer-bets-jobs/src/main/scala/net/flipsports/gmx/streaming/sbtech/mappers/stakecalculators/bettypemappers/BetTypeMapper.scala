package net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators.bettypemappers

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.{BetTypeEnum, ComboBetsTypeEnum}
import net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators.Amount
import net.flipsports.gmx.streaming.sbtech.model.Event

trait BetTypeMapper[T] {

  def resolve(betType: BetTypeEnum, comboSize: Int, events: Seq[Event] = Seq()): T = betType match {
    case BetTypeEnum.SingleBets => singletBet()
    case BetTypeEnum.ComboBets => comboBets(comboSize)
    case BetTypeEnum.CasinoBet => casinoBet(events)
    case BetTypeEnum.SystemBet => systemBet()
    case BetTypeEnum.QABet => qaBetSameAsSingle()
    case BetTypeEnum.Forecast | BetTypeEnum.Tricast | BetTypeEnum.VirtualSureBet | BetTypeEnum.VirtualQABet | BetTypeEnum.VirtualComboBet |
         BetTypeEnum.VirtualSystemBet | BetTypeEnum.VirtualForecastBet | BetTypeEnum.VirtualTricastBet | BetTypeEnum.FirstFour | BetTypeEnum.VirtualFirstFourBet |
         BetTypeEnum.CombinatorBet | BetTypeEnum.YourBet | BetTypeEnum.PulseBet => default() // all should have multiplier like single bet
    case _ => unresolved
  }

  protected def comboBets(comboSize: Int): T = ComboBetsTypeEnum.resolve(comboSize) match {
    case ComboBetsTypeEnum.Skip => comboBetSkip()
    case ComboBetsTypeEnum.SingleBet => comboBetSingle()
    case ComboBetsTypeEnum.DoubleBet => comboBetDouble()
    case ComboBetsTypeEnum.TrebleBet => comboBetTreble()
    case ComboBetsTypeEnum.FourFoldBet => comboBetFourFold()
    case _ => multiFoldBet()
  }

  protected def singletBet(): T

  protected def casinoBet(events: Seq[Event]): T

  protected def systemBet(): T

  protected def qaBetSameAsSingle(): T

  protected def unresolved(): T

  protected def default(): T

  protected def comboBetSingle(): T

  protected def comboBetDouble(): T

  protected def comboBetTreble(): T

  protected def comboBetFourFold(): T

  protected def comboBetSkip(): T

  protected def multiFoldBet(): T

}


object BetTypeMapper {

  type Multiplier = Amount
  type LowerOddsLimit = Amount

  def apply(): BetTypeMapper[Multiplier] = new StandardStakeMultiplier

  def pointEarningPoints(): BetTypeMapper[Multiplier] = new RewardPointEarningAmendsStandardStakeMultiplier

  def lowerLimitEarningPoints: BetTypeMapper[LowerOddsLimit] = new LowerOddsLimitsResolver
}