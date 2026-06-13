package net.flipsports.gmx.streaming.sbtech.streams.downstreams

import net.flipsports.gmx.streaming.common.job.BusinessMetaParameters
import net.flipsports.gmx.streaming.sbtech.SourceTypes.Streams.OddsStream
import net.flipsports.gmx.streaming.sbtech.mappers.v1.SiteExtensionsMapper
import net.flipsports.gmx.streaming.sbtech.streams.splits.SideEffects
import net.flipsports.gmx.streaming.sbtech.udf.{DeduplicateOddsFunction, OddsProcessor}
import net.flipsports.gmx.streaming.sbtech.{SideEffectsImplicits, SourceImplicits, SportEventsImplicits, SportEventsTypes}
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment
import org.apache.flink.streaming.api.windowing.time.Time
import org.apache.flink.streaming.api.windowing.triggers.ProcessingTimeTrigger

class EventsDownstream(val businessMetaParameters: BusinessMetaParameters) extends Downstream[OddsStream, SportEventsTypes.Streams.SportEventUpdateStream] {

  override def processStream(source: OddsStream, env: StreamExecutionEnvironment)(implicit ec: ExecutionConfig): SportEventsTypes.Streams.SportEventUpdateStream = {
    val events = source
      .keyBy(_.id)(SourceImplicits.Odds.id)
      .timeWindow(Time.seconds(1))
      .allowedLateness(Time.milliseconds(500))
      .sideOutputLateData(SideEffects.events)
      .trigger(ProcessingTimeTrigger.create())
      .reduce(DeduplicateOddsFunction())
      .process(OddsProcessor())(SourceImplicits.Odds.keyWithValue)

    val lateEvents =
      events.getSideOutput(SideEffects.events)(SideEffectsImplicits.Events.keyWithValue)

    events.union(lateEvents)
      .map(SiteExtensionsMapper.events())(SportEventsImplicits.SportEventUpdate.keyWithValue)
      .uid(name())
      .name(name())
  }

  def name(): String = "gmx-streaming.sport-events-event-update"

}

object EventsDownstream {

  def apply(businessMetaParameters: BusinessMetaParameters): EventsDownstream = new EventsDownstream(businessMetaParameters)
}