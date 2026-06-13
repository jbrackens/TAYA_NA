package net.flipsports.gmx.streaming.internal.customers.operation.filters.v1

import net.flipsports.gmx.streaming.internal.customers.operation.data.v1.CustomerDetailsDataProvider
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.Gender
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.apache.flink.api.java.tuple.Tuple2

class FemaleBlockRegistrationFilterSpec extends StreamingTestBase {

  val appropriateAffiliateTag = "a_31"

  val filter = FemaleBlockRegistrationFilter()

  "match for female user without Affiliate tag" in {
    // given
    val source = asKeyed

    // when
    val result = filter.filter(source)

    // then
    result shouldEqual (true)
  }

  "not match for male user without Affiliate tag" in {
    // given
    val source = asKeyed
    source.f1.setGender(Gender.Male.name)

    // when
    val result = filter.filter(source)

    // then
    result shouldEqual (false)
  }

  "not match for female user with Affiliate tag" in {
    // given
    val source = asKeyed
    source.f1.setAffiliateTag(appropriateAffiliateTag)

    // when
    val result = filter.filter(source)

    // then
    result shouldEqual (false)
  }


  "not match for male user with Affiliate tag" in {
    // given
    val source = asKeyed
    source.f1.setGender(Gender.Male.name)
    source.f1.setAffiliateTag(appropriateAffiliateTag)

    // when
    val result = filter.filter(source)

    // then
    result shouldEqual (false)
  }

  def asKeyed = {
    val source = CustomerDetailsDataProvider().all.filter(_.f1.getCustomerID == 11272171).head
    new Tuple2(source.f1.getCustomerID, source.f1)
  }
}
