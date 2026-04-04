package net.flipsports.gmx.streaming.sbtech

package object mappers {

  object BetTitles {

    val BetSettlementReward = "Bet Settlement Reward"

    val CasinoSpinReward = "Casino Spin Reward"

    val BonusRewardInPLay2xPoints = "Bonus Reward: In-Play 2x Points"
  }

  object OperationTypes {

    val STD = "STD"

    val BPG = "BPG"
  }

  object MarketingCampaignTransactionId {

    val inPlay2xPoints = 1

  }

  object Leagues {

    val EnglandPremierLeague = 40253L
    val FranceLigue1 = 40032L
    val SpainLaLiga = 40031L
    val ItalySeriaA = 40030L
    val Germany1Bundesliga = 40481L

    def apply = Seq(EnglandPremierLeague, FranceLigue1, SpainLaLiga, ItalySeriaA, Germany1Bundesliga).toSet
  }
}
