package net.flipsports.gmx.streaming.internal.customers.operation.configs

import net.flipsports.gmx.streaming.common.job.BusinessMetaParameters

object TopicNames {

  object Source {
    def logins(configuration: AppConfig, businessMetaParameters: BusinessMetaParameters) = configuration.sourceTopics.logins.format(businessMetaParameters.brand().sourceBrand.name)

    def customerUpdates(configuration: AppConfig, businessMetaParameters: BusinessMetaParameters) = configuration.sourceTopics.customerDetails.format(businessMetaParameters.brand().sourceBrand.name)

    def walletUpdates(configuration: AppConfig, businessMetaParameters: BusinessMetaParameters) = configuration.sourceTopics.walletTransactions.format(businessMetaParameters.brand().sourceBrand.name)
  }

}
