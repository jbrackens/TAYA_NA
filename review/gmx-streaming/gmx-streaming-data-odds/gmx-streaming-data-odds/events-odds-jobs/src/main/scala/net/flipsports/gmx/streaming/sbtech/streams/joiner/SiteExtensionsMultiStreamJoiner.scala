package net.flipsports.gmx.streaming.sbtech.streams.joiner

import net.flipsports.gmx.streaming.common.job.BusinessMetaParameters
import net.flipsports.gmx.streaming.sbtech.SportEventsTypes
import net.flipsports.gmx.streaming.sbtech.configs.Features
import net.flipsports.gmx.streaming.sbtech.dto.SourceStreams
import net.flipsports.gmx.streaming.sbtech.streams.downstreams._
import net.flipsports.gmx.streaming.sbtech.streams.joiner.SiteExtensionsMultiStreamJoiner.Result
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaProducer

class SiteExtensionsMultiStreamJoiner(businessMetaParameters: BusinessMetaParameters, features: Features) extends Serializable {

  def join(env: StreamExecutionEnvironment, streams: SourceStreams, sink: FlinkKafkaProducer[SportEventsTypes.SportEventUpdate.Source])(implicit ec: ExecutionConfig)  = {
    val multiStreams = Seq[Option[Result]](
      withDataStreamIfEnabled(features.events, EventsDownstream(businessMetaParameters).processStream(streams.events, env)),
      withDataStreamIfEnabled(features.markets, MarketsDownstream(businessMetaParameters).processStream(streams.markets, env)),
      withDataStreamIfEnabled(features.selections, SelectionsDownstream(businessMetaParameters).processStream(streams.selections, env)),
      withDataStreamIfEnabled(features.dummy, DummyDownstream(businessMetaParameters).processStream(streams.events, env)),
    )
    addSink(multiStreams, sink)
  }

  protected def addSink(downstreams: Seq[Option[Result]], sink: FlinkKafkaProducer[SportEventsTypes.SportEventUpdate.Source]) =
    downstreams
      .filter(_.isDefined)
      .map(_.get)
      .foreach(_.addSink(sink))

  def withDataStreamIfEnabled(enabled: Boolean, candidate: => Result): Option[Result] =
    if (enabled) Some(candidate) else None

}


object SiteExtensionsMultiStreamJoiner {
  type Result = SportEventsTypes.Streams.SportEventUpdateStream

  def apply(businessMetaParameters: BusinessMetaParameters, features: Features): SiteExtensionsMultiStreamJoiner = new SiteExtensionsMultiStreamJoiner(businessMetaParameters, features)

}