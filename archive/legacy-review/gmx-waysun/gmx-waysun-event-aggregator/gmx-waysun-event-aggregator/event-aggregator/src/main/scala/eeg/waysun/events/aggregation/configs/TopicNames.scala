package eeg.waysun.events.aggregation.configs

import eeg.waysun.events.aggregation.configs.AppConfigDef.AppConfig
import net.flipsports.gmx.streaming.common.job.BusinessMetaParameters

object TopicNames {

  object Source {

    def eventDefinition(configuration: AppConfig, businessMetaParameters: BusinessMetaParameters): String =
      configuration.sourceTopics.eventDefinition.format(businessMetaParameters.brand().sourceBrand.name)

    def validatedEvents(configuration: AppConfig, businessMetaParameters: BusinessMetaParameters): String =
      configuration.sourceTopics.validatedEvents.format(businessMetaParameters.brand().sourceBrand.name)

    def aggregationDefinition(configuration: AppConfig, businessMetaParameters: BusinessMetaParameters): String =
      configuration.sourceTopics.aggregationDefinition.format(businessMetaParameters.brand().sourceBrand.name)

    def aggregationControl(configuration: AppConfig, businessMetaParameters: BusinessMetaParameters): String =
      configuration.sourceTopics.aggregationControl.format(businessMetaParameters.brand().sourceBrand.name)

  }

  object Target {

    def aggregationResult(configuration: AppConfig, businessMetaParameters: BusinessMetaParameters): String =
      configuration.targetTopics.aggregationResult.format(businessMetaParameters.brand().sourceBrand.name)

  }
}
