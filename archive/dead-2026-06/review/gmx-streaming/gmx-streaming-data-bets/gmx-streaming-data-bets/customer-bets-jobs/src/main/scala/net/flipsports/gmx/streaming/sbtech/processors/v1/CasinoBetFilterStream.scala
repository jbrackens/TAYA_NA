package net.flipsports.gmx.streaming.sbtech.processors.v1

import SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1.{CasinoBet, CasinoBetCustomerId}
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.filters.InputOutputFilter
import net.flipsports.gmx.streaming.common.job.kafka.KafkaSink
import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, MetaParameters, QueuedStream}
import net.flipsports.gmx.streaming.common.kafka.source.KafkaSource
import net.flipsports.gmx.streaming.sbtech.configs.SbTechConfig
import net.flipsports.gmx.streaming.sbtech.mappers.v1.CasinoBetToFilteredObjectData
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.api.java.tuple.{Tuple2 => FlinkTuple}
import org.apache.flink.api.java.typeutils.{TupleTypeInfo, TypeExtractor}
import org.apache.flink.streaming.api.functions.sink.SinkFunction
import org.apache.flink.streaming.api.functions.source.SourceFunction
import org.apache.flink.streaming.api.scala.DataStream

class CasinoBetFilterStream(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, configuration: SbTechConfig)
  extends QueuedStream[FlinkTuple[CasinoBetCustomerId, CasinoBet], FlinkTuple[String, String]](metaParameters, businessMetaParameters)(
    CasinoBetFilterStream.inputTypeInformation, CasinoBetFilterStream.outputTypeInformation) {

  val kafkaProperties: KafkaProperties = configuration.kafka.withGroupId(s"gmx-streaming.casino-bet-data-filter-stream-${businessMetaParameters.brand().sourceBrand.name}")

  val sourceTopic: String = configuration.sourceTopics.casinoBets.format(businessMetaParameters.brand().sourceBrand.name)

  val targetTopic: String = configuration.targetTopics.betsFiltered.format(businessMetaParameters.brand().sourceBrand.name)

  override def transform(dataStream: DataStream[FlinkTuple[CasinoBetCustomerId, CasinoBet]])(implicit sourceTypeInformation: TypeInformation[FlinkTuple[CasinoBetCustomerId, CasinoBet]], targetTypeInformation: TypeInformation[FlinkTuple[String, String]]): DataStream[FlinkTuple[String, String]] =
    dataStream.flatMap(new CasinoBetToFilteredObjectData(businessMetaParameters.brand()))

  override def source(implicit ec: ExecutionConfig): SourceFunction[FlinkTuple[CasinoBetCustomerId, CasinoBet]] =
    KafkaSource(sourceTopic, kafkaProperties, configuration.sourceTopics.schemaRegistry).specificKeyValue(classOf[CasinoBetCustomerId], classOf[CasinoBet])

  override def sink(implicit ec: ExecutionConfig): SinkFunction[FlinkTuple[String, String]] =
    KafkaSink.keyed(targetTopic, kafkaProperties, configuration.targetTopics.schemaRegistry).typedKeyAndTypedValue()(ec, CasinoBetFilterStream.outputKeyValueTypeInformation, CasinoBetFilterStream.outputKeyValueTypeInformation)

  override def filtersDefinition: InputOutputFilter[FlinkTuple[CasinoBetCustomerId, CasinoBet], FlinkTuple[String, String]] = InputOutputFilter.alwaysPositive
}

object CasinoBetFilterStream {

    implicit val inputValueTypeInformation: TypeInformation[CasinoBet] = TypeExtractor.getForClass(classOf[CasinoBet])

    implicit val inputKeyTypeInformation: TypeInformation[CasinoBetCustomerId] = TypeExtractor.getForClass(classOf[CasinoBetCustomerId])

    implicit val outputKeyValueTypeInformation: TypeInformation[String] = TypeExtractor.getForClass(classOf[String])

    implicit val inputTypeInformation: TupleTypeInfo[FlinkTuple[CasinoBetCustomerId, CasinoBet]] = new TupleTypeInfo[FlinkTuple[CasinoBetCustomerId, CasinoBet]](inputKeyTypeInformation, inputValueTypeInformation)

    implicit val outputTypeInformation: TupleTypeInfo[FlinkTuple[String, String]] = new TupleTypeInfo(classOf[FlinkTuple[String, String]], outputKeyValueTypeInformation, outputKeyValueTypeInformation)

    def execute(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters,  config: SbTechConfig): Unit = new CasinoBetFilterStream(metaParameters,businessMetaParameters, config).stream()

}
