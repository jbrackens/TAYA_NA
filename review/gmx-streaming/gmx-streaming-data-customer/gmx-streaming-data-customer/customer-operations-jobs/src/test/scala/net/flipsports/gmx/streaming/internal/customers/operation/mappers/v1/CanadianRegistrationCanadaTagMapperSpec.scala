package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1

import net.flipsports.gmx.dataapi.internal.customers.operations.ActionType
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.internal.customers.operation.data.v1.CustomerWithLoginDataProvider
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.{
  CountryCode,
  Tag
}
import net.flipsports.gmx.streaming.tests.StreamingTestBase

class CanadianRegistrationCanadaTagMapperSpec extends StreamingTestBase {

  val mapper = new CanadianRegistrationCanadaTagMapper(Brand.redZone)

  "Canadian registration" should {

    "create tag CANADA in payload" in {
      // given

      // when
      val payload = mapper.transformPayload()
      // then

      payload shouldEqual Tag.Canada.name
    }

    "create tag id" in {
      // given
      val source =
        CustomerWithLoginDataProvider.findCountry(CountryCode.Canada).get

      // when
      val result = mapper.map(source)

      // then
      val value = result.f1
      value.getAction shouldEqual ActionType.TAG
    }

  }
}
