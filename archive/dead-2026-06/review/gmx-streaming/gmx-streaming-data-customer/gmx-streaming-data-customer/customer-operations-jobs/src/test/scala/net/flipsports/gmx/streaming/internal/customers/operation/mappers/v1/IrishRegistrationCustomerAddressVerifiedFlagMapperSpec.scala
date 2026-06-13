package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1

import net.flipsports.gmx.dataapi.internal.customers.operations.ActionType
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.internal.customers.operation.data.v1.CustomerWithLoginDataProvider
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.{CountryCode, Flag}
import net.flipsports.gmx.streaming.tests.StreamingTestBase

class IrishRegistrationCustomerAddressVerifiedFlagMapperSpec extends StreamingTestBase {

  val mapper = new IrishRegistrationCustomerAddressVerifiedFlagMapper(Brand.redZone)

  "Irish registration" should {

    "create flag CustomerVerified in payload" in {
      // given

      // when
      val payload = mapper.transformPayload()

      // then

      payload shouldEqual Flag.CustomerAddressVerified.name
    }

    "create flag id" in {
      // given
      val source = CustomerWithLoginDataProvider.findCountry(CountryCode.Ireland).get
      // when
      val result = mapper.map(source)

      // then
      val value = result.f1
      value.getAction shouldEqual ActionType.FLAG
    }
  }


}