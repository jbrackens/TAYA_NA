package net.flipsports.gmx.streaming.sbtech

import net.flipsports.gmx.racingroulette.api.EventId
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.scala.DataStream

object HorseRacingTypes {

  object Event {
    import net.flipsports.gmx.racingroulette.api.{Event, EventId}
    type KeyType = EventId
    type ValueType = Event
    type Source = Tuple2[KeyType, ValueType]

    val keyClass = classOf[KeyType]
    val valueClass = classOf[ValueType]
  }

  object EventUpdate {
    import net.flipsports.gmx.racingroulette.api.EventUpdate
    type KeyType = EventId
    type ValueType = EventUpdate
    type Source = Tuple2[KeyType, ValueType]

    val keyClass = classOf[KeyType]
    val valueClass = classOf[ValueType]
  }

  object MarketUpdate {
    import net.flipsports.gmx.racingroulette.api.MarketUpdate
    type KeyType = EventId
    type ValueType = MarketUpdate
    type Source = Tuple2[KeyType, ValueType]

    val keyClass = classOf[KeyType]
    val valueClass = classOf[ValueType]
  }

  object SelectionUpdate {
    import net.flipsports.gmx.racingroulette.api.SelectionUpdate
    type KeyType = EventId
    type ValueType = SelectionUpdate
    type Source = Tuple2[KeyType, ValueType]

    val keyClass = classOf[KeyType]
    val valueClass = classOf[ValueType]
  }

  object Streams {

    // site extensions
    type EventStream = DataStream[Event.Source]
    type EventUpdateStream = DataStream[EventUpdate.Source]
    type MarketUpdateStream = DataStream[MarketUpdate.Source]
    type SelectionUpdateStream = DataStream[SelectionUpdate.Source]
  }

}