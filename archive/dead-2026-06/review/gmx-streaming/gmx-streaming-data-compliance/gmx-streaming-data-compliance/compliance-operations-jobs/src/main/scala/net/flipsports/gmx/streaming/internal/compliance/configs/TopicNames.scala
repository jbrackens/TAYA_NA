package net.flipsports.gmx.streaming.internal.compliance.configs

import net.flipsports.gmx.streaming.common.job.BusinessMetaParameters

object TopicNames {

  object Source {
    def walletUpdates(configuration: AppConfig, businessMetaParameters: BusinessMetaParameters) = configuration.sourceTopics.walletTransactions.format(businessMetaParameters.brand().sourceBrand.name)
  }

  object Target {
    def complianceValidation(configuration: AppConfig, businessMetaParameters: BusinessMetaParameters) = configuration.targetTopics.complianceValidation.format(businessMetaParameters.brand().sourceBrand.name)
  }
}
