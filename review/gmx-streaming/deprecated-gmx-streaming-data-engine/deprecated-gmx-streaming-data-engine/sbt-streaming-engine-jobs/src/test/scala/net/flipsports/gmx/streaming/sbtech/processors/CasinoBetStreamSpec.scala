package net.flipsports.gmx.streaming.sbtech.processors

import SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1.CasinoBet
import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.BaseTestSpec
import net.flipsports.gmx.streaming.data.v1.{CasinoBetDataProvider, SourcesDataProvider}
import net.flipsports.gmx.streaming.sbtech.processors.v1.CasinoBetStream
import net.manub.embeddedkafka.EmbeddedKafka
import net.manub.embeddedkafka.avro.{KafkaAvroDeserializer, KafkaAvroSerializer}
import org.apache.avro.specific.SpecificRecord
import org.apache.flink.formats.avro.AvroDeserializationSchema
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaConsumer
import org.apache.kafka.common.serialization.{ByteArrayDeserializer, Deserializer, IntegerDeserializer, LongDeserializer}


class CasinoBetStreamSpec extends BaseTestSpec {

  "Casino bet stream" must {

    "publish messages to kafka and stream it" in {
      val sourceBrand = SourcesDataProvider.redZoneSposts
      val messages = CasinoBetDataProvider.all
      withFlink { _ =>
        withKafkaAndConfig { (config, embeddedKafka) =>

          implicit val kafkaConfig = embeddedKafka
          implicit val serializer = new KafkaAvroSerializer[CasinoBet]()

          val job = new CasinoBetStream(sourceBrand)(config){
            override def consumer[S <: SpecificRecord](clazz: Class[S]): FlinkKafkaConsumer[S] =  new FlinkKafkaConsumer[S](source.get, AvroDeserializationSchema.forSpecific[S](clazz), properties)
          }

          run(job.execute())

          messages.map { i => EmbeddedKafka.publishToKafka(job.source.get, i) }

          eventually {
            val messagesSize = 8
            val valueDeserializer = new KafkaAvroDeserializer[CasinoAndSportBetsTopupData](CasinoAndSportBetsTopupData.SCHEMA$)
            val keyDeserializer: Deserializer[Long] = new LongDeserializer().asInstanceOf[Deserializer[Long]]

            val result = EmbeddedKafka.consumeNumberKeyedMessagesFrom[Long, CasinoAndSportBetsTopupData](job.target, messagesSize)(kafkaConfig, keyDeserializer, valueDeserializer)

            val first = result.head
            first._1.toString shouldBe(first._2.getExternalUserId)

            result.size should be(messagesSize)
          }

        }
      }
    }
  }
}

