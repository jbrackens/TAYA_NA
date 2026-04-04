package net.flipsports.gmx.streaming.sbtech.streams.downstreams

import net.flipsports.gmx.streaming.common.job.BusinessMetaParameters
import net.flipsports.gmx.streaming.sbtech.SourceTypes.Streams.OddsStream
import net.flipsports.gmx.streaming.sbtech.SportEventsTypes.SportEventUpdate
import net.flipsports.gmx.streaming.sbtech.{SportEventsImplicits, SportEventsTypes}
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

class DummyDownstream(val businessMetaParameters: BusinessMetaParameters)
  extends Downstream[OddsStream, SportEventsTypes.Streams.SportEventUpdateStream] {

  override def processStream(dataStream: OddsStream, env: StreamExecutionEnvironment)(implicit ec: ExecutionConfig): SportEventsTypes.Streams.SportEventUpdateStream = {
    dataStream
      .name(name())
      .map( _ => new SportEventUpdate.Source())(SportEventsImplicits.SportEventUpdate.keyWithValue)
  }

  override def name(): String = "gmx-streaming.sport-events-events-dummy"
}

object DummyDownstream {

  def apply(businessMetaParameters: BusinessMetaParameters): DummyDownstream = new DummyDownstream(businessMetaParameters)
}