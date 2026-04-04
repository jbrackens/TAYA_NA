package eeg.waysun.events.achievements.configs

import eeg.waysun.events.achievements.configs.AppConfigDef.AppConfig
import net.flipsports.gmx.streaming.common.job.BusinessMetaParameters

object TopicNames {

  object Source {

    def eventDefinition(configuration: AppConfig, businessMetaParameters: BusinessMetaParameters): String =
      configuration.sourceTopics.definition.format(businessMetaParameters.brand().sourceBrand.name)

    def aggregates(configuration: AppConfig, businessMetaParameters: BusinessMetaParameters): String =
      configuration.sourceTopics.aggregated.format(businessMetaParameters.brand().sourceBrand.name)
  }

  object Target {

    def achievements(configuration: AppConfig, businessMetaParameters: BusinessMetaParameters): String =
      configuration.targetTopics.achievements.format(businessMetaParameters.brand().sourceBrand.name)

  }
}
