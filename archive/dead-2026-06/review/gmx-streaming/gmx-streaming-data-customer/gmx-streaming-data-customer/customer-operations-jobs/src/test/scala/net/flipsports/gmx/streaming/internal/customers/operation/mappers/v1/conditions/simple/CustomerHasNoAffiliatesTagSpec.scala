package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple

import net.flipsports.gmx.streaming.internal.customers.operation.data.v1.CustomerDetailsDataProvider
import net.flipsports.gmx.streaming.tests.StreamingTestBase

class CustomerHasNoAffiliatesTagSpec extends StreamingTestBase {

  val noTag = new CustomerHasNoAffiliatesTag

  "CustomerHasNoAffiliatesTag test" should {

    "return true when no affiliates tags are present " in {
      // given
      val customerSingle = CustomerDetailsDataProvider().single

      //then
      noTag.test(customerSingle.f1) shouldEqual true
    }

    "return true when empty affiliates tags are present " in {
      // given
      val customerSingle = CustomerDetailsDataProvider().single
      customerSingle.f1.setAffiliateTag("    ")

      //then
      noTag.test(customerSingle.f1) shouldEqual true
    }

    "return true when null affiliates tags are present " in {
      // given
      val customerSingle = CustomerDetailsDataProvider().single
      customerSingle.f1.setAffiliateTag(null)

      //then
      noTag.test(customerSingle.f1) shouldEqual true
    }

    "return false when affiliates tags are present " in {
      // given
      val customerSingle = CustomerDetailsDataProvider().single
      customerSingle.f1.setAffiliateTag("thisIsAffiliateTag")

      //then
      noTag.test(customerSingle.f1) shouldEqual false
    }
  }
}
