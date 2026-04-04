package net.flipsports.gmx.streaming.internal.customers.operation.dictionaries

import net.flipsports.gmx.streaming.tests.StreamingTestBase

class OSVersionSpec extends StreamingTestBase {


  "OS Version" should {

    "be detected properly" in {
      OSVersion.apply("iOS") shouldBe Some(OSVersion.iOS)
      OSVersion.apply("iPadOS") shouldBe Some(OSVersion.iPadOS_Default)
      OSVersion.apply("iOS eqw") shouldBe None
      OSVersion.apply("iOS 11") shouldBe Some(OSVersion.iOS_11)
      OSVersion.apply("Android 10") shouldBe Some(OSVersion.Android_10)
    }
  }
}
