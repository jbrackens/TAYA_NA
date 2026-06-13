package net.flipsports.gmx.streaming.internal.customers.operation.job.v1

import net.flipsports.gmx.streaming.common.job.{MetaParameters, SportNationMetaParameters}
import net.flipsports.gmx.streaming.internal.customers.operation.configs.{AppConfig, Features}
import net.flipsports.gmx.streaming.internal.customers.operation.job.BaseNotificatiorJob
import net.flipsports.gmx.streaming.internal.customers.operation.streams.CustomerStateChangeStream

object CustomerStateChangeStreamSportnationJob extends BaseNotificatiorJob("state change", new SportNationMetaParameters {}){

  override lazy val config: AppConfig = loadConfiguration.copy(
    features = Features(
      faccountBlockRegistration = true,
      faccountBlockExtensionRegistration = true,

      canadianRegistration = true,
      highValueCustomer = true,
      preferredSegmentPolicy = true
    )
  )

  def main(args: Array[String]): Unit = CustomerStateChangeStream.execute(args, MetaParameters(name), businessMetaParams, config)

}
