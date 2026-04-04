package net.flipsports.gmx.streaming.sbtech



import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.scala.DataStream

object Types {

  object CasinoBets {
    import SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1.{CasinoBet, CasinoBetCustomerId}
    type KeyType = CasinoBetCustomerId
    type ValueType = CasinoBet
    type Source = Tuple2[KeyType, ValueType]
  }

  object  SportBets {
    import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.{SettlementData, SettlementDataCustomerId}
    type KeyType = SettlementDataCustomerId
    type ValueType = SettlementData
    type Source = Tuple2[KeyType, ValueType]
  }

  object BetInfo {
    import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.Purchase.BetInfo
    import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementDataCustomerId
    type KeyType = SettlementDataCustomerId
    type ValueType = BetInfo
  }

  object Bets {
    import net.flipsports.gmx.streaming.sbtech.model.Bet
    import net.flipsports.gmx.streaming.sbtech.model.Customer
    type KeyType = Customer
    type ValueType = Bet
    type Source = Tuple2[KeyType, ValueType]
  }

  object Topup {
    import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
    type Value = CasinoAndSportBetsTopupData
    type Key = Long
    type Source = Tuple2[Key, Value]

  }

  object Streams {
    type SportBetsStreams = DataStream[SportBets.Source]
    type CasinoBetsStreams = DataStream[CasinoBets.Source]
    type BetsStream = DataStream[Bets.Source]
    type TopupStream = DataStream[Topup.Source]

  }
}
