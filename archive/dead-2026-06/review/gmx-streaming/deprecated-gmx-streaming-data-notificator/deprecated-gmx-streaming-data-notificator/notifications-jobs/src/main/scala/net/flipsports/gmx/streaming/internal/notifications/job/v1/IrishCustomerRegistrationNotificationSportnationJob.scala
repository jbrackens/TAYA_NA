package net.flipsports.gmx.streaming.internal.notifications.job.v1

import net.flipsports.gmx.streaming.common.job.SportNationMetaParameters
import net.flipsports.gmx.streaming.common.job.{MetaParameters}
import net.flipsports.gmx.streaming.internal.notifications.job.{BaseNotificatiorJob}
import net.flipsports.gmx.streaming.internal.notifications.processors.v1.IrishCustomerRegistrationNotificationStream

object IrishCustomerRegistrationNotificationSportnationJob extends BaseNotificatiorJob {

  val brand = new SportNationMetaParameters {}

  val name = s"Irish customer registration events on brand ${brand.brand().sourceBrand.id}"

  def main(args: Array[String]): Unit = IrishCustomerRegistrationNotificationStream.execute(MetaParameters(name), brand, config)

}
