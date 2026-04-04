package net.flipsports.gmx.streaming.sbtech

package object mappers {

  object BetTitles {

    val BetSettlementReward = "Bet Settlement Reward"

    val CasinoSpinReward = "Casino Spin Reward"

    val BonusRewardInPLay2xPoints = "Bonus Reward: In-Play 2x Points"

    val BonusReward4xPoints = "Bonus Reward: 4x Points"

    val BonusRewardPointsEarningAmends = "Bonus Reward: Points earning amends and exemptions"
  }

  object OperationTypes {

    val STD = "STD"

    val BPG = "BPG"
  }

  object MarketingCampaignTransactionId {

    val inPlay2xPoints = 1
    val rewards4xPoints = 2
    val ammends = 3

  }

  object Leagues {

    val EnglandPremierLeague = 40253L

    def apply = Seq(EnglandPremierLeague).toSet
  }
}
