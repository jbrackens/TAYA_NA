package eeg.waysun.events.validators.streams.builders

import eeg.waysun.events.validators.mappers.FailedEventMapper
import eeg.waysun.events.validators.splits.SideEffects
import eeg.waysun.events.validators.{Implicits, Types}

class ValidationFailedStreamBuilder extends Serializable {

  def build(stream: Types.Stream.ValidatedStream): Types.Stream.FailedStream = {
    stream
      .getSideOutput(SideEffects.failed)(Implicits.ValidationFailedImplicit.keyWithValue)
      .map(FailedEventMapper())(Implicits.FailedImplicit.keyWithValue)
      .name("eeg-streaming.failed-events-with-reason")

  }
}

object ValidationFailedStreamBuilder {

  def apply(): ValidationFailedStreamBuilder = new ValidationFailedStreamBuilder
}
