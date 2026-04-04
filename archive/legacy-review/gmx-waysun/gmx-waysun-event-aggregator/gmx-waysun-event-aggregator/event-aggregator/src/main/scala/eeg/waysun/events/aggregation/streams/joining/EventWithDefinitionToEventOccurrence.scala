package eeg.waysun.events.aggregation.streams.joining

import eeg.waysun.events.aggregation.streams.dto.Streams
import eeg.waysun.events.aggregation.udf.EventWithDefinitionProcessFunction
import eeg.waysun.events.aggregation.{Implicits, Types}

object EventWithDefinitionToEventOccurrence {

  def build(streams: Streams): Types.Stream.EventOccurrenceOutputDataStream = {
    streams.validated.map(new EventWithDefinitionProcessFunction())(Implicits.EventOccurrenceImplicit.keyed)
  }
}
