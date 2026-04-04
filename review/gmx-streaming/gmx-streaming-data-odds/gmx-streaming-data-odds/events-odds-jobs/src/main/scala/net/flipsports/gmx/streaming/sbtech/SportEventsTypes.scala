package net.flipsports.gmx.streaming.sbtech


import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.scala.DataStream

object SportEventsTypes {


  object SportEventUpdate {
    import gmx.dataapi.internal.siteextensions.{SportEventUpdate, SportEventUpdateKey}
    type KeyType = SportEventUpdateKey
    type ValueType = SportEventUpdate
    type Source = Tuple2[KeyType, ValueType]

    val KeyClass = classOf[KeyType]
    val ValueClass = classOf[ValueType]
  }

  object SportEventEvent {
    import gmx.dataapi.internal.siteextensions.event.Event
    type KeyType = SportEventUpdate.KeyType
    type ValueType = Event
    type Source = Tuple2[KeyType, ValueType]

    val KeyClass = classOf[KeyType]
    val ValueClass = classOf[ValueType]

    object Participant {
      import gmx.dataapi.internal.siteextensions.event.Participant
      type ValueType = Participant

      val ValueClass = classOf[ValueType]
    }

    object CompetitionParticipantDetails {
      import gmx.dataapi.internal.siteextensions.event.CompetitionParticipantDetails
      type ValueType = CompetitionParticipantDetails

      val ValueClass = classOf[CompetitionParticipantDetails]
    }

    object MatchParticipantDetails {
      import gmx.dataapi.internal.siteextensions.event.MatchParticipantDetails
      type ValueType = MatchParticipantDetails

      val ValueClass = classOf[MatchParticipantDetails]
    }

    object HorseRacingParticipantDetails {
      import gmx.dataapi.internal.siteextensions.event.HorseRacingParticipantDetails
      type ValueType = HorseRacingParticipantDetails

      val ValueClass = classOf[HorseRacingParticipantDetails]
    }
  }

  object SportEventMarket {
    import gmx.dataapi.internal.siteextensions.market.Market
    type KeyType = SportEventUpdate.KeyType
    type ValueType = Market
    type Source = Tuple2[KeyType, ValueType]

    val KeyClass = classOf[KeyType]
    val ValueClass = classOf[ValueType]
  }

  object SportEventSelection {
    import gmx.dataapi.internal.siteextensions.selection.Selection
    type KeyType = SportEventUpdate.KeyType
    type ValueType = Selection
    type Source = Tuple2[KeyType, ValueType]

    val KeyClass = classOf[KeyType]
    val ValueClass = classOf[ValueType]
  }

  object HorseRacingSelectionDetails {
    import gmx.dataapi.internal.siteextensions.selection.HorseRacingSelectionDetails
    type ValueType = HorseRacingSelectionDetails

    val ValueClass = classOf[HorseRacingSelectionDetails]
  }

  object Streams {

    // site extensions
    type SportEventUpdateStream = DataStream[SportEventUpdate.Source]
    type SportEventEventStream = DataStream[SportEventEvent.Source]
    type SportEventMarketStream = DataStream[SportEventMarket.Source]
    type SportEventSelectionStream = DataStream[SportEventSelection.Source]
    type NullSideEffectStream = DataStream[SportEventUpdate.Source]

  }

}