package eeg.waysun.events.achievements.splits

import eeg.waysun.events.achievements.{Implicits, Types}
import org.apache.flink.api.common.state.{MapStateDescriptor, StateTtlConfig, ValueStateDescriptor}
import org.apache.flink.api.common.time.Time

object Descriptors {

  val definitions: MapStateDescriptor[Types.DefinitionType.KeyType, Types.DefinitionType.Stated] =
    new MapStateDescriptor(
      "eeg-streaming.achievement-definitions",
      Implicits.DefinitionImplicit.key,
      Implicits.DefinitionImplicit.stated)

  val lastFiringTime: ValueStateDescriptor[Long] =
    new ValueStateDescriptor("eeg-streaming-events-last-firing-time", classOf[Long])

  val cachedEvents: MapStateDescriptor[Types.JoiningType.AggregationIdType, Types.AggregatedType.Cached] =
    new MapStateDescriptor(
      "eeg-streaming.aggregate-events-cached",
      Implicits.JoiningImplicit.key,
      Implicits.AggregatedImplicit.cached)

  val achievementState: MapStateDescriptor[Types.AchievementStateType.KeyType, Types.AchievementStateType.ValueType] =
    new MapStateDescriptor[Types.AchievementStateType.KeyType, Types.AchievementStateType.ValueType](
      "eeg-streaming.achievement-state",
      Implicits.AchievementStateImplicit.key,
      Implicits.AchievementStateImplicit.value)

  object TimeToLive {

    val twoMinutes = StateTtlConfig
      .newBuilder(Time.minutes(2))
      .setUpdateType(StateTtlConfig.UpdateType.OnCreateAndWrite)
      .setStateVisibility(StateTtlConfig.StateVisibility.NeverReturnExpired)
      .cleanupIncrementally(10, true)
      .build

  }
}
