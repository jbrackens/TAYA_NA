package net.flipsports.gmx.streaming.sbtech.processors.v1

import SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1.{CasinoBet, CasinoBetCustomerId}
import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.filters.InputOutputFilter
import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, MetaParameters, QueuedStream}
import net.flipsports.gmx.streaming.common.kafka.sink.KafkaSink
import net.flipsports.gmx.streaming.common.kafka.source.KafkaSource
import net.flipsports.gmx.streaming.sbtech.configs.SbTechConfig
import net.flipsports.gmx.streaming.sbtech.filters.v1.CasinoBetFilter
import net.flipsports.gmx.streaming.sbtech.mappers.v1.CasinoBetToTopupData
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.api.java.tuple.{Tuple2 => FlinkTuple}
import org.apache.flink.api.java.typeutils.{TupleTypeInfo, TypeExtractor}
import org.apache.flink.streaming.api.functions.sink.SinkFunction
import org.apache.flink.streaming.api.functions.source.SourceFunction
import org.apache.flink.streaming.api.scala.DataStream

class CasinoBetStream(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, configuration: SbTechConfig)
  extends QueuedStream[FlinkTuple[CasinoBetCustomerId, CasinoBet], FlinkTuple[Long, CasinoAndSportBetsTopupData]](metaParameters, businessMetaParameters) (CasinoBetStream.inputTypeInformation, CasinoBetStream.outputTypeInformation) {

  val kafkaProperties: KafkaProperties = configuration.kafka.withGroupId(s"gmx-streaming.casino-bet-data-stream-${businessMetaParameters.brand().sourceBrand.name}")

  val sourceTopic: String = configuration.sourceTopics.casinoBets.format(businessMetaParameters.brand().sourceBrand.name)

  val targetTopic: String = configuration.targetTopics.rewardsPoint.format(businessMetaParameters.brand().sourceBrand.name)

  override def transform(dataStream: DataStream[FlinkTuple[CasinoBetCustomerId, CasinoBet]])(implicit sourceTypeInformation: TypeInformation[FlinkTuple[CasinoBetCustomerId, CasinoBet]], targetTypeInformation: TypeInformation[FlinkTuple[Long, CasinoAndSportBetsTopupData]]): DataStream[FlinkTuple[Long, CasinoAndSportBetsTopupData]] =
    dataStream.map(new CasinoBetToTopupData(businessMetaParameters.brand()))

  override def source(implicit ec: ExecutionConfig): SourceFunction[FlinkTuple[CasinoBetCustomerId, CasinoBet]] =
    KafkaSource(sourceTopic, kafkaProperties, configuration.sourceTopics.schemaRegistry).specificKeyValue(classOf[CasinoBetCustomerId], classOf[CasinoBet])

  override def sink(implicit ec: ExecutionConfig): SinkFunction[FlinkTuple[Long, CasinoAndSportBetsTopupData]] =
    KafkaSink(targetTopic, kafkaProperties).typedKeyAndValue(classOf[Long], classOf[CasinoAndSportBetsTopupData])

  override def filtersDefinition: InputOutputFilter[FlinkTuple[CasinoBetCustomerId, CasinoBet], FlinkTuple[Long, CasinoAndSportBetsTopupData]] = new CasinoBetFilter

}
object CasinoBetStream {

  implicit val inputValueTypeInformation: TypeInformation[CasinoBet] = TypeExtractor.getForClass(classOf[CasinoBet])

  implicit val inputKeyTypeInformation: TypeInformation[CasinoBetCustomerId] = TypeExtractor.getForClass(classOf[CasinoBetCustomerId])

  implicit val inputTypeInformation: TupleTypeInfo[FlinkTuple[CasinoBetCustomerId, CasinoBet]] = new TupleTypeInfo[FlinkTuple[CasinoBetCustomerId, CasinoBet]](inputKeyTypeInformation, inputValueTypeInformation)

  implicit val outputKeyTypeInformation: TypeInformation[Long] = TypeExtractor.getForClass(classOf[Long])

  implicit val outputValueTypeInformation: TypeInformation[CasinoAndSportBetsTopupData] = TypeExtractor.getForClass(classOf[CasinoAndSportBetsTopupData])

  implicit val outputTypeInformation: TupleTypeInfo[FlinkTuple[Long, CasinoAndSportBetsTopupData]] = new TupleTypeInfo(classOf[FlinkTuple[Long, CasinoAndSportBetsTopupData]], outputKeyTypeInformation, outputValueTypeInformation)

  def execute(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters,  config: SbTechConfig): Unit = new CasinoBetStream(metaParameters,businessMetaParameters, config).stream()

}
