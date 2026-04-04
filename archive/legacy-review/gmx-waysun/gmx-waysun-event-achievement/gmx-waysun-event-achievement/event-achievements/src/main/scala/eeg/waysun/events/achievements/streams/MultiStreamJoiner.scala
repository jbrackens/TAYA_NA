package eeg.waysun.events.achievements.streams

import eeg.waysun.events.achievements.mappers.{AchievementKeyBy, AggregationKeyBy}
import eeg.waysun.events.achievements.splits.Descriptors
import eeg.waysun.events.achievements.streams.dto.Streams
import eeg.waysun.events.achievements.udf.{AchievementStateProcessFunction, EventsWithRulesKeyFunction}
import eeg.waysun.events.achievements.{Implicits, Types}
import org.apache.flink.streaming.api.scala.DataStream

class MultiStreamJoiner extends Serializable {

  def join(streams: Streams): DataStream[Types.AchievedType.Source] = {
    val broadcastDefinition = streams.definition.broadcast(Descriptors.definitions)

    streams.aggregationEvent
      .keyBy(AggregationKeyBy.aggregationIdInCompany)(Implicits.JoiningImplicit.key)
      .connect(broadcastDefinition)
      .process(EventsWithRulesKeyFunction())(Implicits.RawWithDefinitionImplicit.output)
      .keyBy(AchievementKeyBy.achievementIdInCompany)(Implicits.AchievementStateImplicit.key)
      .process(AchievementStateProcessFunction())(Implicits.AchievedImplicit.keyWithValue)
  }

}

object MultiStreamJoiner {

  def apply(): MultiStreamJoiner = new MultiStreamJoiner()
}
