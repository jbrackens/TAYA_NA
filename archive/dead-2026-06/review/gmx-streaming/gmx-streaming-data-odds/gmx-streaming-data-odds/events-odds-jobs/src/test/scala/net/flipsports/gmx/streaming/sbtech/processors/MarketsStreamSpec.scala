package net.flipsports.gmx.streaming.sbtech.processors


import net.flipsports.gmx.streaming.sbtech.{BaseStreamingSpec, SourceTypes}
import net.flipsports.gmx.streaming.sbtech.configs.{Features, TopicNames}
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class MarketsStreamSpec extends BaseStreamingSpec {

  "Markets data stream" ignore {
    "publish messages to kafka and stream" in {
      withEnvironment { (appConfig, kafkaProperties, schemaRegistryUrl) =>
        val configuration = withFeatures(appConfig, Features(markets = true))
        val marketsWithNull = markets :+ Tuple2(new SourceTypes.Market.KeyType(markets(0)._1.getId + "1"), null)
        withOddsStream(configuration, kafkaProperties, schemaRegistryUrl)(
          data = () => {
            withMarkets(marketsWithNull, schemaRegistryUrl, TopicNames.Source.markets(configuration, globalBusinessParameters), kafkaProperties)
          },
          assertion = _.size must be(marketsWithNull.size)
        )

      }
    }
  }
}
