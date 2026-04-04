package net.flipsports.gmx.streaming.internal.notifications.processors

import java.time.Duration

import SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1.CustomerDetail
import io.confluent.kafka.schemaregistry.client.SchemaRegistryClient
import io.confluent.kafka.serializers.KafkaAvroSerializer
import net.flipsports.gmx.dataapi.internal.notificator.notifications.{Jira, JiraTask, NotificationEvent}
import net.flipsports.gmx.streaming.common.job.filters.InputOutputFilter
import net.flipsports.gmx.streaming.common.job.kafka.KafkaSink
import net.flipsports.gmx.streaming.common.job.{MetaParameters, RedZoneMetaParameters}
import net.flipsports.gmx.streaming.data.v1.CustomerDetailsDataProvider
import net.flipsports.gmx.streaming.internal.notifications.SchemaRegistryMock
import net.flipsports.gmx.streaming.internal.notifications.filters.v1.IrishCustomerRegistrationNotificationFilter
import net.flipsports.gmx.streaming.internal.notifications.filters.v1.IrishCustomerRegistrationNotificationFilter.isIrishCustomer
import net.flipsports.gmx.streaming.internal.notifications.processors.v1.IrishCustomerRegistrationNotificationStream
import net.flipsports.gmx.streaming.{BaseTestSpec, InternalFlinkMiniCluster, InternalKafkaContainer}
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.api.common.functions.FilterFunction
import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.api.java.typeutils.{TupleTypeInfo, TypeExtractor}
import org.apache.flink.streaming.api.functions.sink.SinkFunction
import org.apache.kafka.clients.consumer.KafkaConsumer
import org.apache.kafka.clients.producer.{KafkaProducer, ProducerRecord}
import org.apache.kafka.common.TopicPartition
import org.apache.kafka.common.serialization.{Deserializer, LongSerializer, StringDeserializer}

import scala.collection.JavaConverters._

class IrishCustomerRegisrationNotificationStreamSpec extends BaseTestSpec with InternalFlinkMiniCluster with InternalKafkaContainer {

  "Customer details stream" must {

    "publish messages to kafka and stream it" in {

      val messages = CustomerDetailsDataProvider.all
      withFlink { _ =>
        withKafka { (config, kafkaProperties) =>

          val mockSchemaRegistry = new SchemaRegistryMock

          implicit val inputValueTypeInformation: TypeInformation[CustomerDetail] = TypeExtractor.getForClass(classOf[CustomerDetail])
          implicit val outputKeyTypeInformation: TypeInformation[String] = TypeExtractor.getForClass(classOf[String])
          implicit val outputValueTypeInformation: TypeInformation[NotificationEvent] = TypeExtractor.getForClass(classOf[NotificationEvent])
          implicit val outputTypeInformation: TupleTypeInfo[Tuple2[String, NotificationEvent]] = new TupleTypeInfo(classOf[Tuple2[String, NotificationEvent]], outputKeyTypeInformation, outputValueTypeInformation)

          val job = new IrishCustomerRegistrationNotificationStream(new MetaParameters(""), new RedZoneMetaParameters {}, config) {
            override def schemaRegistryClient: Option[SchemaRegistryClient] = Some(mockSchemaRegistry)
            override def sink(implicit ec: ExecutionConfig): SinkFunction[Tuple2[String, NotificationEvent]] = {
              KafkaSink.keyed(targetTopic, kafkaProperties, None, None).binaryKeyedValue()
            }

            override def filtersDefinition: InputOutputFilter[CustomerDetail, Tuple2[String, NotificationEvent]] = new  IrishCustomerRegistrationNotificationFilter {
                override def input: FilterFunction[CustomerDetail] =  customer => isIrishCustomer(customer)
              }

          }

          run(job.stream())
          val sourceDataKafkaProducer = new KafkaProducer(kafkaProperties.properties,  new LongSerializer, new KafkaAvroSerializer(mockSchemaRegistry))


          messages.map { i =>
            sourceDataKafkaProducer.send(new ProducerRecord[java.lang.Long, Object](job.sourceTopic, Long2long(i.getCustomerID.toLong), i)).get()
          }

          val valueDeserializer= new KafkaAvroDeserializer[NotificationEvent](NotificationEvent.SCHEMA$)
          val keyDeserializer = new StringDeserializer().asInstanceOf[Deserializer[String]]

          val consumer = new KafkaConsumer[String, NotificationEvent](kafkaProperties.properties, keyDeserializer, valueDeserializer)
          consumer.subscribe(Seq(job.targetTopic).asJava)

          var items = Seq[(String, NotificationEvent)]()
          var executions = 0;
          val partition = new TopicPartition(job.targetTopic, 0)

          do {
            val result = consumer.poll(Duration.ofSeconds(5))
            consumer.commitSync()
            result.records(job.targetTopic).forEach(r => {
              items = items ++ Seq((r.key(), r.value()))
            })
            executions += 1
          } while (consumer.endOffsets(Seq(partition).asJava).get(partition) != consumer.position(partition) && executions < 1000)

          items.size should be(1)

          items(0)._2.getPayload.asInstanceOf[Jira].getExternalUserId.toString should be ("11272172")
        }
      }
    }
  }
}