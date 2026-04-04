package net.flipsports.gmx.streaming.internal.customers.operation.streams.features

import net.flipsports.gmx.streaming.internal.customers.operation.job.v1.CustomerStateChangeStreamRedzoneJob
import net.flipsports.gmx.streaming.tests.StreamingTestBase

class ReadzoneFeaturesSpec extends StreamingTestBase {

  "Redzone streaming" should {


    "have enabled features" in {

      val features = CustomerStateChangeStreamRedzoneJob.config.features


      features.isAnyDummy() shouldBe false

      features.isAnyBuisness() shouldBe true

      features.irishRegistration shouldBe false
      features.faccountMobileCasinoRegistration shouldBe false
      features.canadianRegistration shouldBe false
      features.highValueCustomer shouldBe false
      features.undecidedRegistration shouldBe true
      features.faccountRegistration shouldBe false
      features.preferredSegmentPolicy shouldBe false
    }
  }
}
