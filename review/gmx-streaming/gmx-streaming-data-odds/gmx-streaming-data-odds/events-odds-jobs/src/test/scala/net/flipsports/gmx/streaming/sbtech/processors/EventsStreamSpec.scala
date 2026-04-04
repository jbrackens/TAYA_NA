package net.flipsports.gmx.streaming.sbtech.processors

import net.flipsports.gmx.streaming.sbtech.configs.{Features, TopicNames}
import net.flipsports.gmx.streaming.sbtech.{BaseStreamingSpec, SourceTypes}
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class EventsStreamSpec  extends BaseStreamingSpec {

  "Events data stream" ignore {
    "publish messages to kafka and stream" in {
      withEnvironment { (appConfig, kafkaProperties, schemaRegistryUrl) =>
        val configuration = withFeatures(appConfig, Features(events = true))
        val eventsWithNull = events :+ Tuple2(new SourceTypes.Event.KeyType(events(0)._1.getId + "1"), null)
        withOddsStream(configuration, kafkaProperties, schemaRegistryUrl)(
          data = () => withEvents(eventsWithNull, schemaRegistryUrl, TopicNames.Source.events(configuration, globalBusinessParameters), kafkaProperties),
          assertion = _.size must be(eventsWithNull.size)
        )
      }
    }
  }
}