package net.flipsports.gmx.streaming.sbtech.mappers.v1

import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.data.v1.CustomerDetailsDataProvider
import net.flipsports.gmx.streaming.tests.StreamingTestBase

class CustomerDetailsToUserRequestDataSpec extends StreamingTestBase  {

  class Mapper(brand: Brand) extends CustomerDetailsToUserRequestData(brand)

  "Mapper" should {

    "map user details" in {
      // given
      val source = CustomerDetailsDataProvider.single

      // when
      val result = new Mapper(Brand.redZone).map(source)

      // then
      result.f0 shouldBe(CustomerDetailsDataProvider.externalUserId)
      result.f1.getExternalUserId should be(CustomerDetailsDataProvider.externalUserId.toString)
      result.f1.getCompanyId should be(Brand.redZone.sourceBrand.uuid)
    }
  }

}
