package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1

import net.flipsports.gmx.dataapi.internal.customers.operations.ActionType
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.internal.customers.operation.data.v1.CustomerDetailsDataProvider
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.{Gender, Tag}
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.apache.flink.api.java.tuple.Tuple2

class FemaleRegistrationBlockTagMapperSpec extends StreamingTestBase {

  val mapper = new FemaleRegistrationBlockTagMapper(Brand.sportNations)

  "Female account registration" should {
    val source = CustomerDetailsDataProvider().single
    source.f1.setGender(Gender.Female.toString)

    "create tag sBlock in payload" in {
      // given

      // when
      val payload = mapper.transformPayload()

      // then

      payload shouldEqual Tag.FemaleCustomerBlocked.name
    }

    "create tag id" in {
      // given

      // when
      val result = mapper.map(new Tuple2(source.f0.getCustomerID, source.f1))
      val value = result.f1

      // then
      value.getAction shouldEqual ActionType.TAG
    }

  }

}