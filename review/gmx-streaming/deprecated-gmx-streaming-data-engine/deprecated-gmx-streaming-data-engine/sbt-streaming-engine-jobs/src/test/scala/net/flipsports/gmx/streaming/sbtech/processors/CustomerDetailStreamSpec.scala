package net.flipsports.gmx.streaming.sbtech.processors

import SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1.CustomerDetail
import net.flipsports.gmx.rewardcalculator.api.{CasinoAndSportBetsTopupData, UserRequestData}
import net.flipsports.gmx.streaming.BaseTestSpec
import net.flipsports.gmx.streaming.data.v1.{CustomerDetailsDataProvider, SourcesDataProvider}
import net.flipsports.gmx.streaming.sbtech.processors.v1.CustomerDetailsStream
import net.manub.embeddedkafka.EmbeddedKafka
import net.manub.embeddedkafka.avro.{KafkaAvroDeserializer, KafkaAvroSerializer}
import org.apache.avro.specific.SpecificRecord
import org.apache.flink.formats.avro.AvroDeserializationSchema
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaConsumer
import org.apache.kafka.common.serialization.{Deserializer, LongDeserializer}

class CustomerDetailStreamSpec extends BaseTestSpec {

  "Customer details stream" must {

    "publish messages to kafka and stream it" in {
      val sourceBrand = SourcesDataProvider.redZoneSposts
      val messages = CustomerDetailsDataProvider.all

      withFlink { _ =>
        withKafkaAndConfig { (config, embeddedKafka) =>

          implicit val kafkaConfig = embeddedKafka
          implicit val serializer = new KafkaAvroSerializer[CustomerDetail]()

          val job = new CustomerDetailsStream(sourceBrand)(config){
            override def consumer[S <: SpecificRecord](clazz: Class[S]): FlinkKafkaConsumer[S] =  new FlinkKafkaConsumer[S](source.get, AvroDeserializationSchema.forSpecific[S](clazz), properties)
          }

          run(job.execute())

          messages.map { i => EmbeddedKafka.publishToKafka(job.source.get, i) }

          eventually {
            implicit val deserializer = new KafkaAvroDeserializer[UserRequestData](UserRequestData.SCHEMA$)
            implicit val keyDeserializer:Deserializer[Long] = new LongDeserializer().asInstanceOf[Deserializer[Long]]
            val result = EmbeddedKafka.consumeNumberKeyedMessagesFrom[Long, UserRequestData](job.target, messages.size)(kafkaConfig, keyDeserializer, deserializer)

            val first = result.head
            first._1.toString shouldBe(first._2.getExternalUserId)

            result.size should be(messages.size)
          }
        }
      }
    }
  }
}
