package net.flipsports.gmx.streaming.internal.customers.operation.filters.v1

import net.flipsports.gmx.streaming.internal.customers.operation.data.v1.{CustomerWithLoginDataProvider}
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.{DeviceType, Gender}
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.apache.flink.api.java.tuple.Tuple2

class FemaleBlockExtensionRegistrationFilterSpec extends StreamingTestBase {

  val appropriateAffiliateTag = "a_31"
  val specialAffiliateTag = "a_2410"

  val filter = FemaleBlockExtensionRegistrationFilter()

  "match for female user with special Affiliate tag and registered via web" in {
    // given
    val source = asKeyed
    source.f1.customerDetail.setGender(Gender.Female.name)
    source.f1.customerDetail.setAffiliateTag(specialAffiliateTag)
    source.f1.login.setDeviceType(DeviceType.PersonalComputer.toString)

    // when
    val result = filter.filter(source)

    // then
    result shouldEqual (true)
  }

  "not match for male user without Affiliate tag" in {
    // given
    val source = asKeyed

    // when
    val result = filter.filter(source)

    // then
    result shouldEqual (false)
  }

  "not match for female user with Affiliate tag" in {
    // given
    val source = asKeyed
    source.f1.customerDetail.setGender(Gender.Female.name)
    source.f1.customerDetail.setAffiliateTag(appropriateAffiliateTag)

    // when
    val result = filter.filter(source)

    // then
    result shouldEqual (false)
  }

  "not match for female user with not special Affiliate tag and registered via web" in {
    // given
    val source = asKeyed
    source.f1.customerDetail.setGender(Gender.Female.name)
    source.f1.customerDetail.setAffiliateTag(appropriateAffiliateTag)
    source.f1.login.setDeviceType(DeviceType.PersonalComputer.toString)

    // when
    val result = filter.filter(source)

    // then
    result shouldEqual (false)
  }


  "not match for male user with Affiliate tag" in {
    // given
    val source = asKeyed
    source.f1.customerDetail.setAffiliateTag(appropriateAffiliateTag)

    // when
    val result = filter.filter(source)

    // then
    result shouldEqual (false)
  }

  "not match for male user with special Affiliate tag and registered via web" in {
    // given
    val source = asKeyed
    source.f1.customerDetail.setAffiliateTag(specialAffiliateTag)
    source.f1.login.setDeviceType(DeviceType.PersonalComputer.toString)

    // when
    val result = filter.filter(source)

    // then
    result shouldEqual (false)
  }

  def asKeyed = {
    val source = CustomerWithLoginDataProvider.all.filter(_.f1.customerDetail.getCustomerID == 11272172).head
    new Tuple2(source.f1.customerDetail.getCustomerID, source.f1)
  }
}