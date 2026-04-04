package net.flipsports.gmx.streaming.internal.customers.operation.job.v1

import net.flipsports.gmx.streaming.common.job.{FansbetUkMetaParameters, MetaParameters}
import net.flipsports.gmx.streaming.internal.customers.operation.configs.{AppConfig, Features}
import net.flipsports.gmx.streaming.internal.customers.operation.job.BaseNotificatiorJob
import net.flipsports.gmx.streaming.internal.customers.operation.streams.CustomerStateChangeStream

object CustomerStateChangeStreamFansbetukJob extends BaseNotificatiorJob("state change", new FansbetUkMetaParameters {}){

  def features(): Features = Features()

  override lazy val config: AppConfig = loadConfiguration.copy(
    features = Features(
      faccountRegistration = true,
      preferredSegmentPolicy = true
    )
  )

  def main(args: Array[String]): Unit = CustomerStateChangeStream.execute(args, MetaParameters(name), businessMetaParams, config)

}
