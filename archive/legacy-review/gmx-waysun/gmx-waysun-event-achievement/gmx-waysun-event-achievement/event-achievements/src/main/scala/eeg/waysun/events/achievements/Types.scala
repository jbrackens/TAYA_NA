package eeg.waysun.events.achievements

import eeg.waysun.events.achievements.streams.dto.{AchievementRuleInCompany, AggregationRuleInCompany}
import net.flipsports.gmx.streaming.common.job.streams.dto.{Cache, KeyValue, Output, State}
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.scala.DataStream

object Types {

  object Ids {

    type AchievementRuleId = String
    type AggregationRuleId = String
    type ProjectId = String

  }

  object DefinitionType {
    import stella.dataapi.achievement.{AchievementCondition, AchievementConfiguration, AchievementConfigurationKey}

    type KeyType = AchievementConfigurationKey
    type ValueType = AchievementConfiguration
    type ConditionType = AchievementCondition
    type Source = Tuple2[KeyType, ValueType]
    type Wrapped = KeyValue.KeyedElement[KeyType, ValueType]
    type Stated = State[KeyType, ValueType]

    val keyClass = classOf[KeyType]
    val valueClass = classOf[ValueType]
    val sourceClass = classOf[Source]
    val statedClass = classOf[Stated]
    val wrappedClass = classOf[Wrapped]
  }

  object AggregatedWithDefinitionType {
    import eeg.waysun.events.achievements.streams.dto.AggregationOccurrence

    type KeyType = AchievementRuleInCompany
    type ValueType = AggregationOccurrence
    type Source = Tuple2[KeyType, ValueType]
    type OutputType = Output[KeyValue.KeyedResult[KeyType, ValueType]]

    val keyClass = classOf[KeyType]
    val sourceClass = classOf[Source]
    val outputClass = classOf[OutputType]
  }

  object AggregatedType {
    import stella.dataapi.aggregation.{AggregationResult, AggregationResultKey}

    type KeyType = AggregationResultKey
    type ValueType = AggregationResult
    type Source = Tuple2[KeyType, ValueType]
    type Wrapped = KeyValue.KeyedElement[KeyType, ValueType]
    type Cached = Cache[Wrapped]

    val keyClass = classOf[KeyType]
    val valueClass = classOf[ValueType]
    val sourceClass = classOf[Source]
    val wrappedClass = classOf[Wrapped]
  }

  object AchievedType {
    import stella.dataapi.achievement.event.{AchievementEvent, AchievementEventKey}

    type KeyType = AchievementEventKey
    type ValueType = AchievementEvent
    type Source = Tuple2[KeyType, ValueType]

    val keyClass = classOf[KeyType]
    val valueClass = classOf[ValueType]
    val sourceClass = classOf[Source]
  }

  object AchievementStateType {
    import eeg.waysun.events.achievements.streams.dto.{AchievementState, AchievementStateKey}

    type KeyType = AchievementStateKey
    type ValueType = AchievementState

    val keyClass = classOf[KeyType]
    val valueClass = classOf[ValueType]

  }

  object StreamType {
    type AggregateStream = DataStream[AggregatedType.Wrapped]
    type AchievementDefinitionStream = DataStream[DefinitionType.Wrapped]

    type AchievedStream = DataStream[AchievedType.Source]
  }

  object JoiningType {
    type AggregationIdType = AggregationRuleInCompany

    val aggregationIdClass = classOf[AggregationIdType]
  }
}
