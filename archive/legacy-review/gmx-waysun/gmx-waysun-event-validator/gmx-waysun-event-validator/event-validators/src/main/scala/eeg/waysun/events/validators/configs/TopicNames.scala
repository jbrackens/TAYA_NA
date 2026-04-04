package eeg.waysun.events.validators.configs

import eeg.waysun.events.validators.configs.AppConfigDef.AppConfig
import net.flipsports.gmx.streaming.common.job.BusinessMetaParameters

object TopicNames {

  object Source {

    def eventDefinition(configuration: AppConfig, businessMetaParameters: BusinessMetaParameters): String =
      configuration.sourceTopics.definition.format(businessMetaParameters.brand().sourceBrand.name)

    def events(configuration: AppConfig, businessMetaParameters: BusinessMetaParameters): String =
      configuration.sourceTopics.raw.format(businessMetaParameters.brand().sourceBrand.name)
  }

  object Target {

    def validatedEvents(configuration: AppConfig, businessMetaParameters: BusinessMetaParameters): String =
      configuration.targetTopics.validated.format(businessMetaParameters.brand().sourceBrand.name)

    def failedEvents(configuration: AppConfig, businessMetaParameters: BusinessMetaParameters): String =
      configuration.targetTopics.failed.format(businessMetaParameters.brand().sourceBrand.name)
  }
}
