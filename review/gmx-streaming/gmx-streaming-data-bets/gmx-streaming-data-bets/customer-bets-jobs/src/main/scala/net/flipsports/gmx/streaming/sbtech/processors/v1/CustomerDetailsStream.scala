package net.flipsports.gmx.streaming.sbtech.processors.v1

import SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1.{CustomerDetail, CustomerDetailCustomerId}
import net.flipsports.gmx.rewardcalculator.api.UserRequestData
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.filters.InputOutputFilter
import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, MetaParameters, QueuedStream}
import net.flipsports.gmx.streaming.common.kafka.sink.KafkaSink
import net.flipsports.gmx.streaming.common.kafka.source.KafkaSource
import net.flipsports.gmx.streaming.sbtech.configs.SbTechConfig
import net.flipsports.gmx.streaming.sbtech.mappers.v1.CustomerDetailsToUserRequestData
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.api.java.tuple.{Tuple2 => FlinkTuple}
import org.apache.flink.api.java.typeutils.{TupleTypeInfo, TypeExtractor}
import org.apache.flink.streaming.api.functions.sink.SinkFunction
import org.apache.flink.streaming.api.functions.source.SourceFunction
import org.apache.flink.streaming.api.scala.DataStream

class CustomerDetailsStream(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, configuration: SbTechConfig)
  extends QueuedStream[FlinkTuple[CustomerDetailCustomerId, CustomerDetail], FlinkTuple[Long, UserRequestData]](metaParameters, businessMetaParameters)(CustomerDetailsStream.inputTypeInformation, CustomerDetailsStream.outputTypeInformation) {

  val kafkaProperties: KafkaProperties = configuration.kafka.withGroupId(s"gmx-streaming.customer-details-stream-${businessMetaParameters.brand().sourceBrand.name}")

  val sourceTopic: String = configuration.sourceTopics.customerDetails.format(businessMetaParameters.brand().sourceBrand.name)

  val targetTopic: String = configuration.targetTopics.customerUpsert.format(businessMetaParameters.brand().sourceBrand.name)

  override def transform(dataStream: DataStream[FlinkTuple[CustomerDetailCustomerId, CustomerDetail]])(implicit sourceTypeInformation: TypeInformation[FlinkTuple[CustomerDetailCustomerId, CustomerDetail]], targetTypeInformation: TypeInformation[FlinkTuple[Long, UserRequestData]]): DataStream[FlinkTuple[Long, UserRequestData]] =
    dataStream.map(new CustomerDetailsToUserRequestData(businessMetaParameters.brand()))

  override def source(implicit ec: ExecutionConfig): SourceFunction[FlinkTuple[CustomerDetailCustomerId, CustomerDetail]] =
    KafkaSource(sourceTopic, kafkaProperties, configuration.sourceTopics.schemaRegistry).specificKeyValue(classOf[CustomerDetailCustomerId], classOf[CustomerDetail])

  override def sink(implicit ec: ExecutionConfig): SinkFunction[FlinkTuple[Long, UserRequestData]] =
    KafkaSink(targetTopic, kafkaProperties).typedKeyAndValue(classOf[Long], classOf[UserRequestData])

  override def filtersDefinition: InputOutputFilter[FlinkTuple[CustomerDetailCustomerId, CustomerDetail], FlinkTuple[Long, UserRequestData]] =
    InputOutputFilter.alwaysPositive
}

object CustomerDetailsStream {

  private implicit val inputKeyTypeInformation: TypeInformation[CustomerDetailCustomerId] = TypeExtractor.getForClass(classOf[CustomerDetailCustomerId])

  private implicit val inputValueTypeInformation: TypeInformation[CustomerDetail] = TypeExtractor.getForClass(classOf[CustomerDetail])

  private implicit val outputKeyTypeInformation: TypeInformation[Long] = TypeExtractor.getForClass(classOf[Long])

  private implicit val outputValueTypeInformation: TypeInformation[UserRequestData] = TypeExtractor.getForClass(classOf[UserRequestData])

  implicit val inputTypeInformation: TupleTypeInfo[FlinkTuple[CustomerDetailCustomerId, CustomerDetail]] = new TupleTypeInfo(classOf[FlinkTuple[CustomerDetailCustomerId, CustomerDetail]], inputKeyTypeInformation, inputValueTypeInformation)

  implicit val outputTypeInformation: TupleTypeInfo[FlinkTuple[Long, UserRequestData]] = new TupleTypeInfo(classOf[FlinkTuple[Long, UserRequestData]], outputKeyTypeInformation, outputValueTypeInformation)

  def execute(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters,  config: SbTechConfig): Unit = new CustomerDetailsStream(metaParameters,businessMetaParameters, config).stream()

}


