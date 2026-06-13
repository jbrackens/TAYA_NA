package net.flipsports.gmx.streaming.internal.customers.operation.filters.v1

import net.flipsports.gmx.streaming.internal.customers.operation.data.v1.CustomerDetailsDataProvider
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.{Gender, RegistrationProduct, Tag}
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.apache.flink.api.java.tuple.Tuple2

class FemaleMobileCasinoRegistrationFilterSpec extends StreamingTestBase {


  val filter = FemaleMobileCasinoRegistrationFilter()

  "match for female mobile casino user" in {
    // given
    val source = asKeyed

    // when
    filter.filter(source) shouldEqual (true)
  }

  "not match for male mobile casino user" in {
    // given
    val source = asKeyed
    source.f1.setGender(Gender.Male.name)
    source.f1.setRegistrationProduct(RegistrationProduct.MobileCasino.name)

    // when
    filter.filter(source) shouldEqual (false)
  }

  "not match for male random product user" in {
    // given
    val source = asKeyed
    source.f1.setGender(Gender.Male.name)
    source.f1.setRegistrationProduct("random")

    // when
    filter.filter(source) shouldEqual (false)
  }


  "not match for femaile random product user" in {
    // given
    val source = asKeyed
    source.f1.setRegistrationProduct("random")

    // when
    filter.filter(source) shouldEqual (false)
  }


  "not match for female existed tag" in {
    // given
    val source = asKeyed
    source.f1.setCustomerTags(s"${source.f1.getCustomerTags.toString}#${Tag.CustomerVerified.name}")

    // when
    filter.filter(source) shouldEqual (false)
  }

  def asKeyed = {
    val source = CustomerDetailsDataProvider().all.filter(_.f1.getCustomerID == 11272171).head
    new Tuple2(source.f1.getCustomerID, source.f1)
  }
}
