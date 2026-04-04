package net.flipsports.gmx.streaming.sbtech.processors.v1

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.{SettlementData, SettlementDataCustomerId}
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.filters.InputOutputFilter
import net.flipsports.gmx.streaming.common.job.kafka.KafkaSink
import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, MetaParameters, QueuedStream}
import net.flipsports.gmx.streaming.common.kafka.source.KafkaSource
import net.flipsports.gmx.streaming.sbtech.configs.SbTechConfig
import net.flipsports.gmx.streaming.sbtech.mappers.v1.SettlementDataToFilteredObjectData
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.api.java.tuple.{Tuple2 => FlinkTuple}
import org.apache.flink.api.java.typeutils.{TupleTypeInfo, TypeExtractor}
import org.apache.flink.streaming.api.functions.sink.SinkFunction
import org.apache.flink.streaming.api.functions.source.SourceFunction
import org.apache.flink.streaming.api.scala.DataStream

class SettlementDataFilterStream(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, configuration: SbTechConfig)
  extends QueuedStream[FlinkTuple[SettlementDataCustomerId, SettlementData], FlinkTuple[String, String]](metaParameters, businessMetaParameters)(
    SettlementDataFilterStream.inputTypeInformation, SettlementDataFilterStream.outputTypeInformation)
{

  val typedKey = SettlementDataFilterStream.keyAndValueTypeInformation

  val kafkaProperties: KafkaProperties = configuration.kafka.withGroupId(s"gmx-streaming.settlement-data-filter-stream-${businessMetaParameters.brand().sourceBrand.name}")

  val sourceTopic: String = configuration.sourceTopics.sportBetsInfo.format(businessMetaParameters.brand().sourceBrand.name)

  val targetTopic: String = configuration.targetTopics.betsFiltered.format(businessMetaParameters.brand().sourceBrand.name)

  override def transform(dataStream: DataStream[FlinkTuple[SettlementDataCustomerId, SettlementData]])(implicit sourceTypeInformation: TypeInformation[FlinkTuple[SettlementDataCustomerId, SettlementData]], targetTypeInformation: TypeInformation[FlinkTuple[String, String]]): DataStream[FlinkTuple[String, String]] =
    dataStream.flatMap(new SettlementDataToFilteredObjectData(businessMetaParameters.brand()))

  override def source(implicit ec: ExecutionConfig): SourceFunction[FlinkTuple[SettlementDataCustomerId, SettlementData]] =
    KafkaSource(sourceTopic, kafkaProperties, configuration.sourceTopics.schemaRegistry).specificKeyValue(classOf[SettlementDataCustomerId], classOf[SettlementData])

  override def sink(implicit ec: ExecutionConfig): SinkFunction[FlinkTuple[String, String]] = KafkaSink.keyed[String, String](targetTopic, kafkaProperties).typedKeyAndTypedValue()(ec, typedKey, typedKey)

  override def filtersDefinition: InputOutputFilter[FlinkTuple[SettlementDataCustomerId, SettlementData], FlinkTuple[String, String]] = InputOutputFilter.alwaysPositive
}

object SettlementDataFilterStream {
  implicit val inputValueTypeInformation: TypeInformation[SettlementData] = TypeExtractor.getForClass(classOf[SettlementData])

  implicit val inputKeyTypeInformation: TypeInformation[SettlementDataCustomerId] = TypeExtractor.getForClass(classOf[SettlementDataCustomerId])

  implicit val inputTypeInformation: TupleTypeInfo[FlinkTuple[SettlementDataCustomerId, SettlementData]] = new TupleTypeInfo(classOf[FlinkTuple[SettlementDataCustomerId, SettlementData]], inputKeyTypeInformation, inputValueTypeInformation)

  implicit val keyAndValueTypeInformation: TypeInformation[String] = TypeExtractor.getForClass(classOf[String])

  implicit val outputTypeInformation: TupleTypeInfo[FlinkTuple[String, String]] = new TupleTypeInfo(classOf[FlinkTuple[String, String]], keyAndValueTypeInformation, keyAndValueTypeInformation)

  def execute(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters,  config: SbTechConfig): Unit = new SettlementDataFilterStream(metaParameters,businessMetaParameters, config).stream()

}
