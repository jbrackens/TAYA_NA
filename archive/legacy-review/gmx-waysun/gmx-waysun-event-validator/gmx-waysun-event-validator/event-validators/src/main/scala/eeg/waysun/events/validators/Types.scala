package eeg.waysun.events.validators

import eeg.waysun.events.validators.streams.dto.RawEventId
import net.flipsports.gmx.streaming.common.job.streams.dto.FTuple.{FTuple2, FTuple3}
import net.flipsports.gmx.streaming.common.job.streams.dto.KeyValue
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.scala.DataStream

object Types {

  type ProjectId = String
  type CustomerId = String
  type EventDefinitionRuleIdId = String

  val projectIdClass = classOf[ProjectId]
  val customerIdClass = classOf[CustomerId]
  val eventDefinitionRuleIdClass = classOf[EventDefinitionRuleIdId]

  object Definition {
    import eeg.waysun.events.validators.streams.dto.DefinitionId
    import stella.dataapi.eventconfigurations.{EventConfiguration, EventConfigurationKey}
    type SourceKeyType = EventConfigurationKey
    type KeyType = DefinitionId
    type ValueType = EventConfiguration
    type Source = FTuple2[Definition.SourceKeyType, Definition.ValueType]

    type KeyedType = KeyValue[Definition.KeyType, Definition.ValueType]

    val sourceKeyClass = classOf[SourceKeyType]
    val valueClass = classOf[ValueType]
    val sourceClass = classOf[Source]
    val keyedClass = classOf[KeyedType]
  }

  object Joining {
    type Key = String
    type KeyType = FTuple2[ProjectId, CustomerId]

    val keyClass = classOf[KeyType]
  }

  object RawWithDefinitionKey {
    type KeyType = FTuple2[ProjectId, CustomerId]
    type ValueType = FTuple3[Raw.KeyType, Raw.ValueType, Definition.KeyType]

    type KeyedType = KeyValue[KeyType, ValueType]
    val keyedClass = classOf[KeyedType]
    val keyClass = classOf[KeyType]

  }

  object RawWithDefinition {
    import net.flipsports.gmx.streaming.common.job.streams.dto.JoinedEvents

    type KeyType = RawWithDefinitionKey.KeyType
    type ValueType = JoinedEvents[Raw.KeyType, Raw.ValueType, Definition.KeyType, Definition.ValueType]
    type OutputType = KeyValue[KeyType, ValueType]

    val outputClass = classOf[OutputType]
  }

  object Raw {
    import stella.dataapi.platformevents.{EventEnvelope, EventKey}
    type SourceKeyType = EventKey
    type KeyType = RawEventId
    type ValueType = EventEnvelope
    type Source = FTuple2[Raw.SourceKeyType, Raw.ValueType]
    type KeyedType = KeyValue[Raw.KeyType, Raw.ValueType]

    val keyClass = classOf[KeyType]
    val sourceKeyClass = classOf[SourceKeyType]
    val valueClass = classOf[ValueType]
    val sourceClass = classOf[Source]
    val keyedClass = classOf[KeyedType]
  }

  object Validated {
    import stella.dataapi.platformevents.{EventKey, ValidatedEventEnvelope}

    type KeyType = EventKey
    type ValueType = ValidatedEventEnvelope
    type Source = Tuple2[KeyType, ValueType]

    val keyClass = classOf[KeyType]
    val valueClass = classOf[ValueType]
    val sourceClass = classOf[Source]
  }

  object ValidationFailed {
    import eeg.waysun.events.validators.streams.dto.ValidationFailedEvent

    type KeyType = Raw.KeyType
    type ValueType = ValidationFailedEvent
    type Source = Tuple2[KeyType, ValueType]

    val keyClass = classOf[KeyType]
    val valueClass = classOf[ValueType]
    val sourceClass = classOf[Source]
  }

  object ValidationFailedMethods {
    import stella.dataapi.platformevents.FailedValidationMethods

    type ValueType = FailedValidationMethods

    val valueClass = classOf[ValueType]
  }

  object Failed {
    import stella.dataapi.platformevents.{EventKey, FailedEventEnvelope}

    type KeyType = EventKey
    type ValueType = FailedEventEnvelope
    type Source = Tuple2[KeyType, ValueType]

    val keyClass = classOf[KeyType]
    val valueClass = classOf[ValueType]
    val sourceClass = classOf[Source]
  }

  object Stream {
    type RawDataStream = DataStream[Raw.KeyedType]
    type DefinitionDataStream = DataStream[Definition.KeyedType]

    type ValidatedStream = DataStream[Validated.Source]
    type FailedStream = DataStream[Failed.Source]
  }
}
