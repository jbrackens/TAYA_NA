package net.flipsports.gmx.streaming.sbtech.mappers.v1

import net.flipsports.gmx.streaming.BaseTestSpec
import net.flipsports.gmx.streaming.data.v1.{CustomerDetailsDataProvider, SourcesDataProvider}
import net.flipsports.gmx.streaming.sbtech.configs.ConfigurationLoader

class CustomerDetailsToUserRequestDataSpec extends BaseTestSpec  {

  class Mapper extends CustomerDetailsToUserRequestData

  "Mapper" should {

    "map user details" in {
      // given
      val source = CustomerDetailsDataProvider.single
      val config = ConfigurationLoader.apply

      // when
      val result = new Mapper().mapToTarget(source, config, SourcesDataProvider.redZoneSposts)

      // then
      result.f0 shouldBe(CustomerDetailsDataProvider.externalUserId)
      result.f1.getExternalUserId should be(CustomerDetailsDataProvider.externalUserId.toString)
      result.f1.getCompanyId should be(SourcesDataProvider.redZoneSposts.uuid)
    }
  }

}
