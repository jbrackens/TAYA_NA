package net.flipsports.gmx.streaming.sbtech.streams.downstreams

import net.flipsports.gmx.streaming.common.job.BusinessMetaParameters
import net.flipsports.gmx.streaming.sbtech.SourceTypes.Streams.OddsStream
import net.flipsports.gmx.streaming.sbtech.mappers.v1.SiteExtensionsMapper
import net.flipsports.gmx.streaming.sbtech.streams.splits.SideEffects
import net.flipsports.gmx.streaming.sbtech.udf.{DeduplicateOddsFunction, OddsProcessor}
import net.flipsports.gmx.streaming.sbtech.{SourceImplicits, SportEventsImplicits, SportEventsTypes}
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment
import org.apache.flink.streaming.api.windowing.time.Time
import org.apache.flink.streaming.api.windowing.triggers.ProcessingTimeTrigger

class SelectionsDownstream(val businessMetaParameters: BusinessMetaParameters)
  extends Downstream[OddsStream, SportEventsTypes.Streams.SportEventUpdateStream]  {

  override def processStream(source: OddsStream, env: StreamExecutionEnvironment)(implicit ec: ExecutionConfig): SportEventsTypes.Streams.SportEventUpdateStream = {
  // stream is keyed by event and market
    val selections = source
      .keyBy(_.id)(SourceImplicits.Odds.id)
      .timeWindow(Time.seconds(5))
      .allowedLateness(Time.seconds(1))
      .sideOutputLateData(SideEffects.selections)
      .trigger(ProcessingTimeTrigger.create())
      .reduce(DeduplicateOddsFunction())
      .process(OddsProcessor())(SourceImplicits.Odds.keyWithValue)

    val lateSelections = selections
      .getSideOutput(SideEffects.selections)(SourceImplicits.Odds.keyWithValue)

    selections.union(lateSelections)
      .map(SiteExtensionsMapper.selections())(SportEventsImplicits.SportEventUpdate.keyWithValue)
      .uid(name())
      .name(name())
  }

  def name(): String = "gmx-streaming.sport-events-selection-update"
}

object SelectionsDownstream {

  def apply(businessMetaParameters: BusinessMetaParameters): SelectionsDownstream = new SelectionsDownstream(businessMetaParameters)
}