package eeg.waysun.events.validators.streams

import eeg.waysun.events.validators.Implicits
import eeg.waysun.events.validators.Types.Validated.{Source => Validated}
import eeg.waysun.events.validators.splits.Descriptors
import eeg.waysun.events.validators.streams.dto.Streams
import eeg.waysun.events.validators.udf.{
  EventDefinitionValidationFunction,
  EventValidationFunction,
  EventsWithRulesKeyFunction
}
import net.flipsports.gmx.streaming.common.configs.JobExecutionParameters
import org.apache.flink.streaming.api.scala.DataStream

class MultiStreamJoiner(implicit executionParameters: JobExecutionParameters) {

  def join(streams: Streams): DataStream[Validated] = {
    val broadcastDefinition = streams.definition.broadcast(Descriptors.definitions)

    streams.raw
      .connect(broadcastDefinition)
      .process(new EventsWithRulesKeyFunction())(Implicits.RawWithDefinitionKeyImplicit.output)
      .keyBy(_.key)(Implicits.RawWithDefinitionKeyImplicit.key)
      .connect(broadcastDefinition)
      .process(new EventDefinitionValidationFunction())(Implicits.RawWithDefinitionImplicit.keyWithValue)
      .keyBy(_.key)(Implicits.RawWithDefinitionKeyImplicit.key)
      .process(new EventValidationFunction())(Implicits.ValidatedImplicit.keyWithValue)
  }

}
