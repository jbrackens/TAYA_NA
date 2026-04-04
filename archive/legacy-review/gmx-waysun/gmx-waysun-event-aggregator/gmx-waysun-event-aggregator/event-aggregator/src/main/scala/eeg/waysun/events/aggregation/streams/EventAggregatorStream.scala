package eeg.waysun.events.aggregation.streams

import eeg.waysun.events.aggregation.Types.Stream
import eeg.waysun.events.aggregation.configs.AppConfigDef.AppConfig
import eeg.waysun.events.aggregation.mappers.{AggregationKeyBy, AggregationWindowUnlimitedRangeMapper}
import eeg.waysun.events.aggregation.streams.builders._
import eeg.waysun.events.aggregation.streams.dto.Streams
import eeg.waysun.events.aggregation.streams.joining.{
  AggregationCandidateToOccurrence => AggregationOccurrnceProvider,
  AggregationWithControlJoiner => AggregationControlProvider,
  EventOccurrenceToAggregationCandidate => AggregationCandidateProvider,
  EventWithDefinitionToEventOccurrence => EventOccuranceProvider
}
import eeg.waysun.events.aggregation.{Implicits, Types}
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, CustomStream, MetaParameters}
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.streaming.api.TimeCharacteristic
import org.apache.flink.streaming.api.functions.sink.SinkFunction
import org.apache.flink.streaming.api.functions.source.SourceFunction
import org.apache.flink.streaming.api.scala.{DataStream, StreamExecutionEnvironment}

class EventAggregatorStream(
    args: Array[String],
    metaParameters: MetaParameters,
    businessMetaParameters: BusinessMetaParameters,
    configuration: AppConfig)
    extends CustomStream(args, metaParameters, businessMetaParameters) {

  val kafkaProperties: KafkaProperties = configuration.kafka.withGroupId(
    s"eeg-streaming.events-aggregator-on-${businessMetaParameters.brand().sourceBrand.name}")

  lazy val sources: SourceBuilder = SourceBuilder(kafkaProperties, configuration, businessMetaParameters)

  lazy val sinks: SinkBuilder = SinkBuilder(kafkaProperties, configuration, businessMetaParameters)

  lazy val validatedEvents: SourceFunction[Types.Validated.Source] = sources.validatedEvents

  lazy val aggregationDefinitions: SourceFunction[Types.AggregationDefinition.Source] = sources.aggregationDefinitions

  lazy val aggregationControls: SourceFunction[Types.AggregationControl.Source] = sources.aggregationControls

  lazy val aggregationResults: SinkFunction[Types.AggregationResult.SinkType] = sinks.aggregationResults

  override def buildStreamTopology(env: StreamExecutionEnvironment, brand: Brand)(implicit ec: ExecutionConfig): Unit =
    buildTopology(env).addSink(aggregationResults)

  def validatedStream(env: StreamExecutionEnvironment): Stream.ValidatedEventsKeyedDataStream =
    ValidatedStreamBuilder.build(env, validatedEvents)

  def aggregationDefinitionStream(env: StreamExecutionEnvironment): Stream.AggregationDefinitionKeyedDataStream =
    AggregationDefinitionStreamBuilder.build(env, aggregationDefinitions)

  def aggregationControlStream(env: StreamExecutionEnvironment): Stream.AggregationControlKeyedDataStream =
    AggregationControlStreamBuilder.build(env, aggregationControls)

  def aggregationsInProjectStream(aggregationDefinitionStream: Types.Stream.AggregationDefinitionKeyedDataStream) =
    AggregationInProjectsStreamBuilder.build(aggregationDefinitionStream)

  def buildStreams(env: StreamExecutionEnvironment): Streams = {
    val aggregationDefinition = aggregationDefinitionStream(env)
    Streams(
      validated = validatedStream(env),
      aggregationDefinition = aggregationDefinitionStream(env),
      aggregationsInProjects = aggregationsInProjectStream(aggregationDefinition),
      aggregationControl = aggregationControlStream(env))
  }

  def buildJoinedTopologyOnStreams: Streams => Types.Stream.AggregationResultOutputDataStream = { streams =>
    val eventOccurrence = EventOccuranceProvider.build(streams)
    val aggregationCandidate = AggregationCandidateProvider.build(streams, eventOccurrence)
    val aggregationOccurrence = AggregationOccurrnceProvider.build(streams, aggregationCandidate)
    AggregationControlProvider.aggregationControl(streams, aggregationOccurrence, configuration)
  }

  def buildTopology(env: StreamExecutionEnvironment): DataStream[Types.AggregationResult.SinkType] = {
    env.setStreamTimeCharacteristic(TimeCharacteristic.IngestionTime)
    val streams: Streams = buildStreams(env)

    buildJoinedTopologyOnStreams(streams)
      .map(AggregationWindowUnlimitedRangeMapper())(Implicits.AggregationResultImplicit.keyed)
      .map(AggregationKeyBy.asSinkType)(Implicits.AggregationResultImplicit.sink)
  }
}
