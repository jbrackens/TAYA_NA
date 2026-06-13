package net.flipsports.gmx.streaming.internal.customers.operation.filters.v1

import net.flipsports.gmx.streaming.internal.customers.operation.data.v1.CustomerDetailsDataProvider
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.{Gender, RegistrationProduct, Tag}
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.apache.flink.api.java.tuple.Tuple2

class FemaleMobileRegistrationFilterSpec extends StreamingTestBase {

  val registrationProductMobile = RegistrationProduct.Mobile.toString
  val appropriateAffiliateTag = "a_31"

  val filter = FemaleMobileRegistrationFilter()

  "match for female mobile user with Affiliate tag" in {
    // given
    val source = asKeyed
    source.f1.setRegistrationProduct(registrationProductMobile)
    source.f1.setAffiliateTag(appropriateAffiliateTag)

    // when
    val result = filter.filter(source)

    // then
    result shouldEqual (true)
  }

  "not match for male mobile user" in {
    // given
    val source = asKeyed
    source.f1.setGender(Gender.Male.name)
    source.f1.setRegistrationProduct(RegistrationProduct.Mobile.name)

    // when
    val result = filter.filter(source)

    // then
    result shouldEqual (false)
  }

  "not match for male random product user" in {
    // given
    val source = asKeyed
    source.f1.setGender(Gender.Male.name)
    source.f1.setRegistrationProduct("random")
    source.f1.setAffiliateTag(appropriateAffiliateTag)

    // when
    val result = filter.filter(source)

    // then
    result shouldEqual (false)
  }


  "not match for female random product user" in {
    // given
    val source = asKeyed
    source.f1.setRegistrationProduct("random")
    source.f1.setAffiliateTag(appropriateAffiliateTag)

    // when
    val result = filter.filter(source)

    // then
    result shouldEqual (false)
  }


  "not match for female existed tag" in {
    // given
    val source = asKeyed
    source.f1.setRegistrationProduct(registrationProductMobile)
    source.f1.setAffiliateTag(appropriateAffiliateTag)
    source.f1.setCustomerTags(s"${source.f1.getCustomerTags.toString}#${Tag.CustomerVerified.name}")

    // when
    val result = filter.filter(source)

    // then
    result shouldEqual (false)
  }

  "not match for female without Affiliate tag" in {
    // given
    val source = asKeyed
    source.f1.setRegistrationProduct(registrationProductMobile)

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
