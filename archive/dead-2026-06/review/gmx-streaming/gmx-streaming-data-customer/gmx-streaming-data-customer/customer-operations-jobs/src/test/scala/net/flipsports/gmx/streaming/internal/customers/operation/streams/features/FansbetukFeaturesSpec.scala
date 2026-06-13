package net.flipsports.gmx.streaming.internal.customers.operation.streams.features

import net.flipsports.gmx.streaming.internal.customers.operation.job.v1.CustomerStateChangeStreamFansbetukJob
import net.flipsports.gmx.streaming.tests.StreamingTestBase

class FansbetukFeaturesSpec extends StreamingTestBase {

  "Fansbet streaming" should {


    "have enabled features" in {

      val features = CustomerStateChangeStreamFansbetukJob.config.features

      features.isAnyDummy() shouldBe false
      features.isAnyBuisness() shouldBe true

      features.faccountMobileCasinoRegistration shouldBe false
      features.faccountRegistration shouldBe true
      features.faccountBlockRegistration shouldBe false

      features.irishRegistration shouldBe false
      features.canadianRegistration shouldBe false
      features.highValueCustomer shouldBe false
      features.undecidedRegistration shouldBe false
      features.preferredSegmentPolicy shouldBe true
    }
  }
}
