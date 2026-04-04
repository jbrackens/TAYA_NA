package eeg.waysun.events.achievements.udf

import com.typesafe.scalalogging.LazyLogging
import stella.dataapi.achievement.AchievementTriggerBehaviour
import eeg.waysun.events.achievements.Types
import eeg.waysun.events.achievements.Types.AchievedType.Source
import eeg.waysun.events.achievements.Types.AchievementStateType.KeyType
import eeg.waysun.events.achievements.Types.AggregatedWithDefinitionType.OutputType
import eeg.waysun.events.achievements.Types._
import eeg.waysun.events.achievements.conditions.{AchievementConditionsSatisfiedCheck, AchievementFiringPolicyCheck}
import eeg.waysun.events.achievements.mappers.AchievementOccurrenceMapper
import eeg.waysun.events.achievements.splits.Descriptors
import net.flipsports.gmx.streaming.common.logging.{JoinedStreamingLogLevels, log}
import org.apache.flink.api.common.state.MapState
import org.apache.flink.configuration.Configuration
import org.apache.flink.streaming.api.functions.KeyedProcessFunction
import org.apache.flink.util.Collector

class AchievementStateProcessFunction
    extends KeyedProcessFunction[
      AchievementStateType.KeyType,
      AggregatedWithDefinitionType.OutputType,
      AchievedType.Source]
    with LazyLogging {

  lazy val loggingLevel = new JoinedStreamingLogLevels {}

  @transient
  protected var collectedAchievementState: MapState[AchievementStateType.KeyType, AchievementStateType.ValueType] = _

  override def open(parameters: Configuration): Unit = {
    log(logger, "Initialization of additional function state.", loggingLevel.global)
    collectedAchievementState = getRuntimeContext.getMapState(Descriptors.achievementState)
    log(logger, "Initialization of additional done.", loggingLevel.global)
  }

  def collectAggregateToAchievement(
      key: AchievementStateType.KeyType,
      value: AggregatedWithDefinitionType.OutputType): AchievementStateType.ValueType = {
    val achievementState = getOrCreateAchievement(key, value)
    collectedAchievementState.put(key, achievementState)
    achievementState
  }

  def getOrCreateAchievement(
      key: AchievementStateType.KeyType,
      value: AggregatedWithDefinitionType.OutputType): AchievementStateType.ValueType = {
    val achievementState = if (collectedAchievementState.contains(key)) {
      collectedAchievementState.get(key)
    } else {
      val aggregatedWithDefinition = value.result.value.get
      new AchievementStateType.ValueType(
        definitionKey = aggregatedWithDefinition.achievementDefinition.key,
        definition = aggregatedWithDefinition.achievementDefinition.value)
    }
    val aggregationRuleId = value.result.value.get.aggregation.key.getAggregationRuleId.toString
    val newAggregation: Map[Types.Ids.AggregationRuleId, Types.AggregatedType.Wrapped] = {
      val element = aggregationRuleId -> value.result.value.get.aggregation
      if (achievementState.aggregates.contains(aggregationRuleId)) {
        value.result.value.get.achievementDefinition.value.triggerBehaviour match {
          case AchievementTriggerBehaviour.ONLY_ONCE => achievementState.aggregates
          // in case of fire always updating aggregate value to newest
          case AchievementTriggerBehaviour.ALWAYS => (achievementState.aggregates - element._1) + element
        }
      } else {
        achievementState.aggregates + element
      }
    }

    achievementState.copy(aggregates = newAggregation)
  }
  override def processElement(
      value: AggregatedWithDefinitionType.OutputType,
      ctx: KeyedProcessFunction[
        AchievementStateType.KeyType,
        AggregatedWithDefinitionType.OutputType,
        AchievedType.Source]#Context,
      out: Collector[AchievedType.Source]): Unit = {
    val key = ctx.getCurrentKey
    val achievementState = collectAggregateToAchievement(key, value)

    val firingPolicy = AchievementFiringPolicyCheck(achievementState)
    val conditionsAreFullFiled = AchievementConditionsSatisfiedCheck(achievementState)

    if (firingPolicy.check && conditionsAreFullFiled.check) {
      achievementState.aggregates.values
        .map(AchievementOccurrenceMapper(_, achievementState.definitionKey, achievementState.definition).toAchievement)
        .map(out.collect)

      collectedAchievementState.put(key, achievementState.copy(fired = true))
    }
  }

  override def onTimer(
      timestamp: Long,
      ctx: KeyedProcessFunction[KeyType, OutputType, Source]#OnTimerContext,
      out: Collector[Source]): Unit = {
    //TODO: WAYS-742 implement cleaning
  }
}

object AchievementStateProcessFunction {

  def apply(): KeyedProcessFunction[
    AchievementStateType.KeyType,
    AggregatedWithDefinitionType.OutputType,
    AchievedType.Source] = new AchievementStateProcessFunction()
}
