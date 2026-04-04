package net.flipsports.gmx.streaming.sbtech.configs

import net.flipsports.gmx.streaming.common.job.BusinessMetaParameters
import org.apache.flink.util.StringUtils

object TopicNames {

  object Source {
    def events(configuration: AppConfig, businessMetaParameters: BusinessMetaParameters) = configuration.sourceTopics.events.format(businessMetaParameters.brand().sourceBrand.name)

    def markets(configuration: AppConfig, businessMetaParameters: BusinessMetaParameters) = configuration.sourceTopics.markets.format(businessMetaParameters.brand().sourceBrand.name)

    def selections(configuration: AppConfig, businessMetaParameters: BusinessMetaParameters) = configuration.sourceTopics.selections.format(businessMetaParameters.brand().sourceBrand.name)
  }

  object Target {

    def odds(configuration: AppConfig, businessMetaParameters: BusinessMetaParameters) = {
      val subsetName = if (StringUtils.isNullOrWhitespaceOnly(configuration.features.subsetName))
        ""
      else
        s"-${configuration.features.subsetName}"
      configuration.targetTopics.odds.format(businessMetaParameters.brand().sourceBrand.name, subsetName)
    }

  }


}
