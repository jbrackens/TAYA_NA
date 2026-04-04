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

class MarketsDownstream(businessMetaParameters: BusinessMetaParameters)
  extends Downstream[OddsStream, SportEventsTypes.Streams.SportEventUpdateStream] {

  def processStream(source: OddsStream, env: StreamExecutionEnvironment)(implicit ec: ExecutionConfig): SportEventsTypes.Streams.SportEventUpdateStream = {
    // stream is keyed by event id
    val markets = source
      .keyBy(_.id)(SourceImplicits.Odds.id)
      .timeWindow(Time.seconds(2))
      .allowedLateness(Time.seconds(1))
      .sideOutputLateData(SideEffects.markets)
      .trigger(ProcessingTimeTrigger.create())
      .reduce(DeduplicateOddsFunction())
      .process(OddsProcessor())(SourceImplicits.Odds.keyWithValue)

    val lateMarkets = markets
      .getSideOutput(SideEffects.markets)(SideEffectsImplicits.Markets.keyWithValue)


    markets.union(lateMarkets)
      .map(SiteExtensionsMapper.markets())(SportEventsImplicits.SportEventUpdate.keyWithValue)
      .uid(name())
      .name(name())
  }


  def name(): String = "gmx-streaming.sport-events-market-update"

}

object MarketsDownstream {

  def apply(businessMetaParameters: BusinessMetaParameters): MarketsDownstream = new MarketsDownstream(businessMetaParameters)
}