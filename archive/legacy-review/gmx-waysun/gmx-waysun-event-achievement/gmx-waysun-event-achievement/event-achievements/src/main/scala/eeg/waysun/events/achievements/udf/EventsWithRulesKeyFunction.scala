package eeg.waysun.events.achievements.udf

import eeg.waysun.events.achievements.Types._
import eeg.waysun.events.achievements.conditions.{
  AchievementConfigurationMatchCheck,
  AchievementDefinitionAnyAggregationRuleIdCheck,
  AchievementDefinitionCompanyCheck
}
import eeg.waysun.events.achievements.mappers.AggregationWithDefinitionOccurrenceMapper
import eeg.waysun.events.achievements.splits.Descriptors
import net.flipsports.gmx.streaming.common.job.streams.JoinBroadcastedByKey
import net.flipsports.gmx.streaming.common.job.streams.dto.{KeyValue, Output, State}
import org.apache.flink.streaming.api.functions.co.KeyedBroadcastProcessFunction

class EventsWithRulesKeyFunction
    extends JoinBroadcastedByKey[
      JoiningType.AggregationIdType,
      AggregatedType.KeyType,
      AggregatedType.ValueType,
      DefinitionType.KeyType,
      DefinitionType.ValueType,
      AggregatedWithDefinitionType.KeyType,
      AggregatedWithDefinitionType.ValueType](
      cacheStateDescriptor = Descriptors.cachedEvents,
      definitionStateDescriptor = Descriptors.definitions) {

  override def shouldAcceptDefinition(
      currentKey: JoiningType.AggregationIdType,
      cacheKey: DefinitionType.KeyType,
      cacheValue: DefinitionType.ValueType): Boolean = {
    val achievementInCompany = AchievementDefinitionCompanyCheck(currentKey, cacheKey)
    val achievementDefinitionWithAggregationRuleId =
      AchievementDefinitionAnyAggregationRuleIdCheck(currentKey, cacheValue)
    achievementInCompany.check && achievementDefinitionWithAggregationRuleId.check
  }

  override def shouldAcceptEvent(
      key: JoiningType.AggregationIdType,
      definition: State[DefinitionType.KeyType, DefinitionType.ValueType],
      event: Event): Boolean = AchievementConfigurationMatchCheck(definition, event).check

  override def buildValueResult(
      key: JoiningType.AggregationIdType,
      definition: State[DefinitionType.KeyType, DefinitionType.ValueType],
      item: Event): Option[AggregatedWithDefinitionType.ValueType] =
    AggregationWithDefinitionOccurrenceMapper.toAggregationWithDefinition(definition, item)

  def buildKeyResult(
      definition: State[DefinitionType.KeyType, DefinitionType.ValueType]): AggregatedWithDefinitionType.KeyType =
    new AggregatedWithDefinitionType.KeyType(
      projectId = definition.key.getProjectId.toString,
      achievementRuleId = definition.key.getAchievementRuleId.toString)

}

object EventsWithRulesKeyFunction {

  def apply(): KeyedBroadcastProcessFunction[
    JoiningType.AggregationIdType,
    AggregatedType.Wrapped,
    DefinitionType.Wrapped,
    Output[KeyValue.KeyedResult[AggregatedWithDefinitionType.KeyType, AggregatedWithDefinitionType.ValueType]]] =
    new EventsWithRulesKeyFunction()
}
