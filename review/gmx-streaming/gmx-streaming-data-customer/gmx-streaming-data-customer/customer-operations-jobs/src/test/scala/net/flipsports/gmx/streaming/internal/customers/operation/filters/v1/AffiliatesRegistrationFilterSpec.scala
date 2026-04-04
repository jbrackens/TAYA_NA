package net.flipsports.gmx.streaming.internal.customers.operation.filters.v1

import net.flipsports.gmx.streaming.internal.customers.operation.data.v1.CustomerDetailsDataProvider
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.{Gender}
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.apache.flink.api.java.tuple.Tuple2

class AffiliatesRegistrationFilterSpec extends StreamingTestBase {

  val filter = AffiliatesRegistrationFilter()
  val properCustomer = CustomerDetailsDataProvider().single

  "AffiliatesRegistrationFilterSpec" should {

    "match for all criteria fulfilled for customer" in {
      // given
      properCustomer.f1.setGender(Gender.Female.toString)
      properCustomer.f1.setAffiliateTag("a_535")

      // when
      val result = filter.filter(new Tuple2(properCustomer.f0.getCustomerID, properCustomer.f1))

      // then
      result shouldEqual true
    }

    "failed for not proper customer" in {
      // given
      properCustomer.f1.setGender(Gender.Male.toString)
      properCustomer.f1.setAffiliateTag("a_11111")

      // when
      val result = filter.filter(new Tuple2(properCustomer.f0.getCustomerID, properCustomer.f1))

      // then
      result shouldEqual false
    }

  }
}
