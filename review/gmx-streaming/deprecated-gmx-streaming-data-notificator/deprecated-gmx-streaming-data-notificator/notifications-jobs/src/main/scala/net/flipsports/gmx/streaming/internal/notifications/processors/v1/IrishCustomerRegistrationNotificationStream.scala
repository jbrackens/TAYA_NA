package net.flipsports.gmx.streaming.internal.notifications.processors.v1

import SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1.CustomerDetail
import io.confluent.kafka.schemaregistry.client.SchemaRegistryClient
import net.flipsports.gmx.dataapi.internal.notificator.notifications.NotificationEvent
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.filters.InputOutputFilter
import net.flipsports.gmx.streaming.common.job.kafka.{KafkaSink, KafkaSource}
import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, MetaParameters, QueuedStream}
import net.flipsports.gmx.streaming.internal.notifications.configs.AppConfig
import net.flipsports.gmx.streaming.internal.notifications.filters.v1.IrishCustomerRegistrationNotificationFilter
import net.flipsports.gmx.streaming.internal.notifications.mappers.v1.CustomerDetailsToJiraNotificationData
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.api.java.typeutils.{TupleTypeInfo, TypeExtractor}
import org.apache.flink.streaming.api.functions.sink.SinkFunction
import org.apache.flink.streaming.api.functions.source.SourceFunction
import org.apache.flink.streaming.api.scala.DataStream

class IrishCustomerRegistrationNotificationStream(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, configuration: AppConfig)
                                                 (implicit sourceTypeInformation: TypeInformation[CustomerDetail], targetKeyTypeInformation: TypeInformation[String], targetValueTypeInformation: TypeInformation[NotificationEvent])
  extends QueuedStream[CustomerDetail, Tuple2[String, NotificationEvent]](metaParameters, businessMetaParameters) {

  val kafkaProperties: KafkaProperties = configuration.kafka.withGroupId(s"irish-customer-registration-notification-stream-${businessMetaParameters.brand().sourceBrand.name}")

  val sourceTopic: String = configuration.sourceTopics.customerDetails.format(businessMetaParameters.brand().sourceBrand.id)

  val targetTopic: String = s"${configuration.targetTopics.notifications}"

  override def transform(dataStream: DataStream[CustomerDetail])(implicit sourceTypeInformation: TypeInformation[CustomerDetail], targetTypeInformation: TypeInformation[Tuple2[String, NotificationEvent]]): DataStream[Tuple2[String, NotificationEvent]] =
    dataStream.map(new CustomerDetailsToJiraNotificationData(businessMetaParameters.brand()))

  override def source(implicit ec: ExecutionConfig): SourceFunction[CustomerDetail] = new KafkaSource(sourceTopic, kafkaProperties, Some(configuration.sourceTopics.schemaRegistry), schemaRegistryClient).consumer()

  override def sink(implicit ec: ExecutionConfig): SinkFunction[Tuple2[String, NotificationEvent]] = KafkaSink.keyed(targetTopic, kafkaProperties, Some(configuration.targetTopics.schemaRegistry), schemaRegistryClient).binaryKeyedValue()

  def schemaRegistryClient: Option[SchemaRegistryClient] = None

  override def filtersDefinition: InputOutputFilter[CustomerDetail, Tuple2[String, NotificationEvent]] = new IrishCustomerRegistrationNotificationFilter()

}

object IrishCustomerRegistrationNotificationStream {

  private implicit val inputValueTypeInformation: TypeInformation[CustomerDetail] = TypeExtractor.getForClass(classOf[CustomerDetail])

  private implicit val outputKeyTypeInformation: TypeInformation[String] = TypeExtractor.getForClass(classOf[String])

  private implicit val outputValueTypeInformation: TypeInformation[NotificationEvent] = TypeExtractor.getForClass(classOf[NotificationEvent])

  private implicit val outputTypeInformation: TypeInformation[Tuple2[String, NotificationEvent]] = new TupleTypeInfo(classOf[Tuple2[String, NotificationEvent]], outputKeyTypeInformation, outputValueTypeInformation)

  def execute(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters,  config: AppConfig): Unit = new IrishCustomerRegistrationNotificationStream(metaParameters,businessMetaParameters, config).stream()

}


