package net.flipsports.gmx.streaming.internal.customers.operation.filters.v1

import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.internal.customers.operation.data.v1.CustomerWithLoginDataProvider
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.{DeviceType, Gender}
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.apache.flink.api.java.tuple.Tuple2

class NewSegmentAccountRegistrationFilterSpec extends StreamingTestBase {

  val filterSportNation = NewSegmentAccountRegistrationFilter(Brand.sportNations)
  val filterFansBet = NewSegmentAccountRegistrationFilter(Brand.fansbetUk)

  val properCustomer = CustomerWithLoginDataProvider.single
  properCustomer.f1.login.setDeviceType(DeviceType.PersonalComputer.toString)
  properCustomer.f1.customerDetail.setEmail("thisIsSomeEmail@gmail.com")
  properCustomer.f1.customerDetail.setGender(Gender.Male.toString)
  properCustomer.f1.customerDetail.setAffiliateTag("")

  val appropriateAffiliateTag = "a_31"
  val inappropriateAffiliateTag = "31"
  val anotherInappropriateAffiliateTag = "a_311"
  val notGmailEmail = "thisIsSomeEmail@yahoo.com"

  "NewSegmentAccountRegistrationFilterSpec" should {

    "match for all criteria fulfilled for SN customer" in {
      // given

      // when
      val result =
        filterSportNation.filter(new Tuple2(properCustomer.f0, properCustomer.f1))

      // then
      result shouldEqual true
    }

    "match for all criteria fulfilled for SN customer with Affiliate Tag=a_31" in {
      // given
      properCustomer.f1.customerDetail.setAffiliateTag(appropriateAffiliateTag)

      // when
      val result =
        filterSportNation.filter(new Tuple2(properCustomer.f0, properCustomer.f1))

      // then
      result shouldEqual true
    }

    "fail with SN customer registered not via web" in {
      // given
      properCustomer.f1.login.setDeviceType(DeviceType.Smartphone.toString)
      properCustomer.f1.customerDetail.setAffiliateTag(inappropriateAffiliateTag)

      // when
      val result =
        filterSportNation.filter(new Tuple2(properCustomer.f0, properCustomer.f1))

      // then
      result shouldEqual false
    }

    "fail with SN customer with not gmail email" in {
      // given
      properCustomer.f1.customerDetail.setEmail(notGmailEmail)
      properCustomer.f1.customerDetail.setAffiliateTag(inappropriateAffiliateTag)

      // when
      val result =
        filterSportNation.filter(new Tuple2(properCustomer.f0, properCustomer.f1))

      // then
      result shouldEqual false
    }

    "fail with SN customer with wrong Affiliate Tag" in {
      // given
      properCustomer.f1.customerDetail.setEmail(notGmailEmail)
      properCustomer.f1.customerDetail.setAffiliateTag(anotherInappropriateAffiliateTag)

      // when
      val result =
        filterSportNation.filter(new Tuple2(properCustomer.f0, properCustomer.f1))

      // then
      result shouldEqual false
    }

    "fail with SN customer with female gender" in {
      // given
      properCustomer.f1.customerDetail.setGender(Gender.Female.toString)

      // when
      val result =
        filterSportNation.filter(new Tuple2(properCustomer.f0, properCustomer.f1))

      // then
      result shouldEqual false
    }

    "fail with random SN customer" in {
      // given
      val properCustomer = CustomerWithLoginDataProvider.single

      // when
      val result =
        filterSportNation.filter(new Tuple2(properCustomer.f0, properCustomer.f1))

      // then
      result shouldEqual false
    }

    "match for all criteria fulfilled for FB customer" in {
      // given
      properCustomer.f1.login.setDeviceType(DeviceType.PersonalComputer.toString)
      properCustomer.f1.customerDetail.setGender(Gender.Male.toString)
      properCustomer.f1.customerDetail.setAffiliateTag("")

      // when
      val result =
        filterFansBet.filter(new Tuple2(properCustomer.f0, properCustomer.f1))
      // then
      result shouldEqual true
    }

    "fail with FB customer registered not via web" in {
      // given
      properCustomer.f1.login.setDeviceType(DeviceType.Smartphone.toString)

      // when
      val result =
        filterFansBet.filter(new Tuple2(properCustomer.f0, properCustomer.f1))

      // then
      result shouldEqual false
    }

    "fail with FB customer with not empty Affiliate Tag" in {
      // given
      properCustomer.f1.customerDetail.setEmail(notGmailEmail)
      properCustomer.f1.customerDetail.setAffiliateTag(appropriateAffiliateTag)

      // when
      val result =
        filterFansBet.filter(new Tuple2(properCustomer.f0, properCustomer.f1))

      // then
      result shouldEqual false
    }

    "fail with FB customer with female gender" in {
      // given
      properCustomer.f1.customerDetail.setGender(Gender.Female.toString)

      // when
      val result =
        filterFansBet.filter(new Tuple2(properCustomer.f0, properCustomer.f1))

      // then
      result shouldEqual false
    }

  }
}
