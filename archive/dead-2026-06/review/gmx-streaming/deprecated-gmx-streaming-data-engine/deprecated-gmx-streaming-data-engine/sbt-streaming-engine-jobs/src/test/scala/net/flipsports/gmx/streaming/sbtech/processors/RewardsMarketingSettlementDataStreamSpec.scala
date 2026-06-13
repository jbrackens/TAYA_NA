package net.flipsports.gmx.streaming.sbtech.processors

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementData
import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.BaseTestSpec
import net.flipsports.gmx.streaming.data.v1.{SettlementDataProvider, SourcesDataProvider}
import net.flipsports.gmx.streaming.sbtech.processors.v1.RewardsMarketingSettlementDataStream
import net.manub.embeddedkafka.EmbeddedKafka
import net.manub.embeddedkafka.avro.{KafkaAvroDeserializer, KafkaAvroSerializer}
import org.apache.avro.specific.SpecificRecord
import org.apache.flink.formats.avro.AvroDeserializationSchema
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaConsumer
import org.apache.kafka.common.serialization.{Deserializer, LongDeserializer}

class RewardsMarketingSettlementDataStreamSpec extends BaseTestSpec {

  "Settlement data stream" must {

    "publish messages to kafka and stream with filtering" in {
      val sourceBrand = SourcesDataProvider.sportsNations
      val messages = SettlementDataProvider.apply("rewardsMarketing/settlementdata.json").all

      withFlink { _ =>
        withKafkaAndConfig { (config, embeddedKafka) =>

          val amountsMathFilters = 6

          implicit val kafkaConfig = embeddedKafka
          implicit val serializer = new KafkaAvroSerializer[SettlementData]()

          val job = new RewardsMarketingSettlementDataStream(sourceBrand)(config) {
            override def consumer[S <: SpecificRecord](clazz: Class[S]): FlinkKafkaConsumer[S] =  new FlinkKafkaConsumer[S](source.get, AvroDeserializationSchema.forSpecific[S](clazz), properties)
          }

          run(job.execute())


          messages.map { i => EmbeddedKafka.publishToKafka(job.source.get, i) }

          eventually {
            implicit val deserializer = new KafkaAvroDeserializer[CasinoAndSportBetsTopupData](CasinoAndSportBetsTopupData.SCHEMA$)
            implicit val keyDeserializer:Deserializer[Long] = new LongDeserializer().asInstanceOf[Deserializer[Long]]
            val result = EmbeddedKafka.consumeNumberKeyedMessagesFrom[Long, CasinoAndSportBetsTopupData](job.target, amountsMathFilters)(kafkaConfig, keyDeserializer, deserializer)

            result.size should be(amountsMathFilters)
          }
        }
      }
    }

  }
}
