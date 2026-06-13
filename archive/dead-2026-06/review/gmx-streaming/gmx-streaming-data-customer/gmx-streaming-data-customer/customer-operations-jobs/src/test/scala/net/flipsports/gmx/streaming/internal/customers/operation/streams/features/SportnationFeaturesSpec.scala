package net.flipsports.gmx.streaming.internal.customers.operation.streams.features

import net.flipsports.gmx.streaming.internal.customers.operation.job.v1.CustomerStateChangeStreamSportnationJob
import net.flipsports.gmx.streaming.tests.StreamingTestBase

class SportnationFeaturesSpec extends StreamingTestBase {

  "Sportnation streaming" should {

    "have enabled features" in {

      val features = CustomerStateChangeStreamSportnationJob.config.features


      features.isAnyDummy() shouldBe false
      features.isAnyBuisness() shouldBe true

      features.faccountRegistration shouldBe false
      features.faccountMobileCasinoRegistration shouldBe false
      features.faccountBlockRegistration shouldBe true

      features.irishRegistration shouldBe false
      features.canadianRegistration shouldBe true
      features.highValueCustomer shouldBe true
      features.undecidedRegistration shouldBe false
      features.preferredSegmentPolicy shouldBe true
    }
  }
}
