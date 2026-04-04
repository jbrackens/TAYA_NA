package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1

import net.flipsports.gmx.dataapi.internal.customers.operations.ActionType
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.internal.customers.operation.data.v1.CustomerWithLoginDataProvider
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.{CountryCode, Tag}
import net.flipsports.gmx.streaming.tests.StreamingTestBase

class IrishRegistrationCustomerServiceManualTagMapperSpec extends StreamingTestBase {

  val mapper = new IrishRegistrationCustomerServiceManualTagMapper(Brand.redZone)

  "Female account registration" should {
    val source = CustomerWithLoginDataProvider.findCountry(CountryCode.Ireland).get

    "create tag CustomerVerified in payload" in {
      // given

      // when
      val payload = mapper.transformPayload()

      // then

      payload shouldEqual Tag.CustomerServiceManual.name
    }

    "create tag id" in {
      // given

      // when
      val result = mapper.map(source)

      // then
      val value = result.f1
      value.getAction shouldEqual ActionType.TAG
    }

  }


}