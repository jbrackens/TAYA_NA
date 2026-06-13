package net.flipsports.gmx.streaming.sbtech.processors

import net.flipsports.gmx.streaming.sbtech.{BaseStreamingSpec, SourceTypes}
import net.flipsports.gmx.streaming.sbtech.configs.{Features, TopicNames}
import org.scalatest.MustMatchers.convertToAnyMustWrapper


class SelectionsStreamSpec extends BaseStreamingSpec {

  "Selections data stream" ignore {
    "publish messages to kafka and stream" in {
      withEnvironment { (appConfig, kafkaProperties, schemaRegistryUrl) =>
        val configuration = withFeatures(appConfig, Features(selections = true))
        val selectionsWithNull = selections :+ Tuple2(new SourceTypes.Selection.KeyType(selections(0)._1.getId + "1"), null)
        withOddsStream(configuration, kafkaProperties, schemaRegistryUrl)(
          data = () => {
            withSelections(selectionsWithNull, schemaRegistryUrl, TopicNames.Source.selections(configuration, globalBusinessParameters), kafkaProperties)
          },
          assertion = _.size must be(selectionsWithNull.size)
        )

      }
    }
  }

}