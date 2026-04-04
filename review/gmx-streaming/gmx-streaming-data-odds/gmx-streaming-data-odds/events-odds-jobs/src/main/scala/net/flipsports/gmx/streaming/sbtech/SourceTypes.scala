package net.flipsports.gmx.streaming.sbtech


import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.scala.DataStream


object SourceTypes {

  object Event {
    import sbtech.sportsData.contracts.avro.{event, eventId}
    type KeyType = eventId
    type ValueType = event
    type Source = Tuple2[KeyType, ValueType]

    val KeyClass = classOf[KeyType]
    val ValueClass = classOf[ValueType]


    object Participant {
      import sbtech.sportsData.contracts.avro.participant
      type ValueType = participant

      val ValueClass = classOf[ValueType]
    }
  }

  object Market {
    import sbtech.sportsData.contracts.avro.{market, marketId}
    type KeyType = marketId
    type ValueType = market
    type Source = Tuple2[KeyType, ValueType]

    val KeyClass = classOf[KeyType]
    val ValueClass = classOf[ValueType]
  }

  object Selection {
    import sbtech.sportsData.contracts.avro.{selection, selectionId}
    type KeyType = selectionId
    type ValueType = selection
    type Source = Tuple2[KeyType, ValueType]

    val KeyClass = classOf[KeyType]
    val ValueClass = classOf[ValueType]
   }

  object Odds {
    import net.flipsports.gmx.streaming.sbtech.dto.Odds

    type Source = Odds

  }

  object Streams {
    type EventStream = DataStream[Event.Source]
    type MarketStream = DataStream[Market.Source]
    type SelectionStream = DataStream[Selection.Source]
    type OddsStream = DataStream[Odds.Source]
  }

}
