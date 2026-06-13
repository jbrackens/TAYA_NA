package net.flipsports.gmx.streaming.sbtech

import net.flipsports.gmx.streaming.BaseTestSpec
import net.flipsports.gmx.streaming.data.v1.SourcesDataProvider
import net.flipsports.gmx.streaming.sbtech.configs.ConfigurationLoader
import net.flipsports.gmx.streaming.sbtech.processors.v1.SettlementDataStream

object LocalRunnerStream extends BaseTestSpec with App {

  val sourceBrand = SourcesDataProvider.sportsNations

  withFlink { _ =>
    val kafkaHost = "10.6.12.101:9092"
    val config = ConfigurationLoader.apply("sbTech").get
    val customProperties = config.copy(
      kafka = config.kafka.copy(kafkaHost, config.kafka.offsetConfig),
      kafkaTopics = config.kafkaTopics,
      sources = config.sources
    )
    new SettlementDataStream(sourceBrand)(customProperties).execute()
  }

}
