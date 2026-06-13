package net.flipsports.gmx.streaming.internal.customers.operation.job.v1

import net.flipsports.gmx.streaming.common.job.{MetaParameters, RedZoneMetaParameters}
import net.flipsports.gmx.streaming.internal.customers.operation.configs.{AppConfig, Features}
import net.flipsports.gmx.streaming.internal.customers.operation.job.BaseNotificatiorJob
import net.flipsports.gmx.streaming.internal.customers.operation.streams.CustomerStateChangeStream

object CustomerStateChangeStreamRedzoneJob extends BaseNotificatiorJob("state change", new RedZoneMetaParameters {}) {

 override lazy val config: AppConfig = loadConfiguration.copy(
   features = Features(
     undecidedRegistration = true
   )
 )

  def main(args: Array[String]): Unit = CustomerStateChangeStream.execute(args, MetaParameters(name), businessMetaParams, config)

}
