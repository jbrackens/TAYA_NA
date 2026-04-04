package net.flipsports.gmx.streaming.sbtech.processors

import SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1.CasinoBet
import net.flipsports.gmx.streaming.BaseTestSpec
import net.flipsports.gmx.streaming.data.v1.{CasinoBetDataProvider, SourcesDataProvider}
import net.flipsports.gmx.streaming.sbtech.processors.v1.CasinoBetFilterStream
import net.manub.embeddedkafka.EmbeddedKafka
import net.manub.embeddedkafka.avro.KafkaAvroSerializer
import org.apache.avro.specific.SpecificRecord
import org.apache.flink.formats.avro.AvroDeserializationSchema
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaConsumer
import org.apache.kafka.common.serialization.StringDeserializer


class CasinoBetFilterStreamSpec extends BaseTestSpec {

  "Casino bet stream" must {

    "publish messages to kafka and filter" in {
      val sourceBrand = SourcesDataProvider.redZoneSposts
      val messages = CasinoBetDataProvider.all
      withFlink { _ =>
        withKafkaAndConfig { (config, embeddedKafka) =>

          implicit val kafkaConfig = embeddedKafka
          implicit val serializer = new KafkaAvroSerializer[CasinoBet]()

          val job = new CasinoBetFilterStream(sourceBrand)(config){
            override def consumer[S <: SpecificRecord](clazz: Class[S]): FlinkKafkaConsumer[S] =  new FlinkKafkaConsumer[S](source.get, AvroDeserializationSchema.forSpecific[S](clazz), properties)
          }

          run(job.execute())

          messages.map { i => EmbeddedKafka.publishToKafka(job.source.get, i) }

          eventually {
            implicit val keyDeserializer = new StringDeserializer()
            val result = EmbeddedKafka.consumeNumberKeyedMessagesFrom[String, String](job.target, 2)

            result.size should be(2)
          }

        }
      }
    }
  }
}

