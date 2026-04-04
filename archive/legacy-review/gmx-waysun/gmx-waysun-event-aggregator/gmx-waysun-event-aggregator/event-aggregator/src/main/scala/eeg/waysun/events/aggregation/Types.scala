package eeg.waysun.events.aggregation

import net.flipsports.gmx.streaming.common.job.streams.dto.FTuple.FTuple2
import net.flipsports.gmx.streaming.common.job.streams.dto.KeyValue
import org.apache.flink.streaming.api.scala.DataStream

object Types {

  type EventDefinitionRuleId = String
  type EventName = String
  type AggregationDefinitionRuleId = String
  type ProjectId = String
  type UserId = String

  object Validated {
    import stella.dataapi.platformevents.{EventKey, FieldTyped, ValidatedEventEnvelope}

    type KeyType = EventKey
    type ValueType = ValidatedEventEnvelope
    type Source = FTuple2[KeyType, ValueType]
    type KeyedType = KeyValue[KeyType, ValueType]
    type FieldType = FieldTyped

    val keyClass = classOf[KeyType]
    val valueClass = classOf[ValueType]
    val keyedClass = classOf[KeyedType]
    val sourceClass = classOf[Source]

  }

  object EventOccurrence {
    import eeg.waysun.events.aggregation.streams.dto.{EventOccurrence, EventOccurrenceId}

    type KeyType = EventOccurrenceId
    type ValueType = EventOccurrence
    type KeyedType = KeyValue[KeyType, ValueType]

    val keyedClass = classOf[KeyedType]

  }

  object AggregationsInProjects {

    type KeyType = Types.ProjectId
    type ValueType = Types.AggregationDefinitionRuleId
    type ValuesType = Set[Types.AggregationDefinitionRuleId]
    type KeyedType = KeyValue[KeyType, ValueType]

    val keyClass = classOf[KeyType]
    val valueClass = classOf[ValueType]
    val valuesClass = classOf[Set[ValueType]]
    val keyedClass = classOf[KeyedType]

  }

  object AggregationDefinition {
    import stella.dataapi.aggregation.{
      AggregationCondition,
      AggregationRuleConfiguration,
      AggregationRuleConfigurationKey
    }

    type KeyType = AggregationRuleConfigurationKey
    type ValueType = AggregationRuleConfiguration
    type ConditionType = AggregationCondition
    type Source = FTuple2[KeyType, ValueType]
    type KeyedType = KeyValue[KeyType, ValueType]

    val keyClass = classOf[KeyType]
    val valueClass = classOf[ValueType]
    val sourceClass = classOf[Source]
    val keyedClass = classOf[KeyedType]
  }

  object AggregationCandidate {
    import eeg.waysun.events.aggregation.streams.dto.AggregationCandidateId

    type KeyType = AggregationCandidateId
    type ValueType = EventOccurrence.ValueType
    type KeyedType = KeyValue[KeyType, ValueType]

    val keyClass = classOf[KeyType]
    val valueClass = classOf[ValueType]
    val keyedClass = classOf[KeyedType]

  }

  object AggregationOccurrence {
    import eeg.waysun.events.aggregation.streams.dto.{Aggregation, AggregationCandidateId}

    type KeyType = AggregationCandidateId
    type ValueType = Aggregation
    type Source = FTuple2[KeyType, ValueType]
    type KeyedType = KeyValue[KeyType, ValueType]

    val sourceClass = classOf[Source]
    val keyedClass = classOf[KeyedType]
    val keyClass = classOf[KeyType]
  }

  object AggregationResult {
    import eeg.waysun.events.aggregation.streams.dto.Window
    import stella.dataapi.aggregation.{AggregationResult, AggregationResultKey}

    type WindowKeyType = Window
    type KeyType = AggregationResultKey
    type ValueType = AggregationResult
    type KeyedType = KeyValue[KeyType, ValueType]
    type SinkType = FTuple2[KeyType, ValueType]

    val windowKeyClass = classOf[WindowKeyType]
    val keyClass = classOf[KeyType]
    val valueClass = classOf[ValueType]
    val keyedClass = classOf[KeyedType]
    val sinkClass = classOf[SinkType]

  }

  object AggregationControl {
    import eeg.waysun.events.aggregation.streams.dto.{AggregationControl, AggregationControlId}

    type KeyType = AggregationControlId
    type ValueType = AggregationControl
    type Source = FTuple2[KeyType, ValueType]
    type KeyedType = KeyValue[KeyType, ValueType]

    val keyClass = classOf[KeyType]
    val valueClass = classOf[ValueType]
    val sourceClass = classOf[Source]
    val keydClass = classOf[KeyedType]
  }

  object Stream {
    type ValidatedEventsDataStream = DataStream[Validated.Source]
    type AggregationDefinitionDataStream = DataStream[AggregationDefinition.Source]

    type EventOccurrenceOutputDataStream = DataStream[EventOccurrence.KeyedType]
    type ValidatedEventsKeyedDataStream = DataStream[Validated.KeyedType]
    type AggregationDefinitionKeyedDataStream = DataStream[AggregationDefinition.KeyedType]
    type AggregationInProjectsKeyedDataStream = DataStream[AggregationsInProjects.KeyedType]
    type AggregationControlKeyedDataStream = DataStream[AggregationControl.KeyedType]
    type AggregationCandidateOutputDataStream = DataStream[AggregationCandidate.KeyedType]
    type AggregationOccurrenceOutputDataStream = DataStream[AggregationOccurrence.KeyedType]
    type AggregationResultOutputDataStream = DataStream[AggregationResult.KeyedType]
  }
}
