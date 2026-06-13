package net.flipsports.gmx.streaming.sbtech.processors

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementData
import net.flipsports.gmx.streaming.BaseTestSpec
import net.flipsports.gmx.streaming.data.v1.{SettlementDataProvider, SourcesDataProvider}
import net.flipsports.gmx.streaming.sbtech.processors.v1.SettlementDataFilterStream
import net.manub.embeddedkafka.EmbeddedKafka
import net.manub.embeddedkafka.avro.KafkaAvroSerializer
import org.apache.avro.specific.SpecificRecord
import org.apache.flink.formats.avro.AvroDeserializationSchema
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaConsumer
import org.apache.kafka.common.serialization.StringDeserializer


class SportBetsFilterStreamSpec extends BaseTestSpec {

  "Sport bet stream" must {

    "publish messages to kafka and dont filter any" in {
      val sourceBrand = SourcesDataProvider.redZoneSposts
      val messages = SettlementDataProvider.apply.all
      withFlink { _ =>
        withKafkaAndConfig { (config, embeddedKafka) =>

          implicit val kafkaConfig = embeddedKafka
          implicit val serializer = new KafkaAvroSerializer[SettlementData]()

          val job = new SettlementDataFilterStream(sourceBrand)(config){
            override def consumer[S <: SpecificRecord](clazz: Class[S]): FlinkKafkaConsumer[S] =  new FlinkKafkaConsumer[S](source.get, AvroDeserializationSchema.forSpecific[S](clazz), properties)
          }
          run(job.execute())

          messages.map { i => EmbeddedKafka.publishToKafka(job.source.get, i) }

          eventually {

            val messagesCount = 0

            implicit val keyDeserializer = new StringDeserializer()
            val result = EmbeddedKafka.consumeNumberKeyedMessagesFrom[String, String](job.target, messagesCount)

            logger.info(s"Got filterred items : $result")
            result.size should be(messagesCount)
          }

        }
      }
    }

    "publish messages to kafka and dont filter all" in {
      val sourceBrand = SourcesDataProvider.redZoneSposts
      val messages = SettlementDataProvider.apply("filter/settlementdata.json").all
      withFlink { cluster =>
        withKafkaAndConfig { (config, embeddedKafka) =>

          implicit val kafkaConfig = embeddedKafka
          implicit val serializer = new KafkaAvroSerializer[SettlementData]()
          val job = new SettlementDataFilterStream(sourceBrand)(config){
            override def consumer[S <: SpecificRecord](clazz: Class[S]): FlinkKafkaConsumer[S] =  new FlinkKafkaConsumer[S](source.get, AvroDeserializationSchema.forSpecific[S](clazz), properties)
          }

          run(job.execute())

          messages.map { i => EmbeddedKafka.publishToKafka(job.source.get, i) }

          eventually {

            val messagesCount = 5

            implicit val keyDeserializer = new StringDeserializer()
            val result = EmbeddedKafka.consumeNumberKeyedMessagesFrom[String, String](job.target, messagesCount)

            logger.info(s"Got filterred items : $result")
            result.size should be(messagesCount)
          }

        }
      }
    }
  }
}

