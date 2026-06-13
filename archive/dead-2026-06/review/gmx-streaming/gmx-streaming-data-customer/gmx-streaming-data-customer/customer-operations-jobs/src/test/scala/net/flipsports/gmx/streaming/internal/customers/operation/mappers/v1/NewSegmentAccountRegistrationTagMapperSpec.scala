package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1

import net.flipsports.gmx.dataapi.internal.customers.operations.ActionType
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.internal.customers.operation.data.v1.CustomerWithLoginDataProvider
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.Tag
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.apache.flink.api.java.tuple.Tuple2

class NewSegmentAccountRegistrationTagMapperSpec extends StreamingTestBase {

  val mapper = new NewSegmentAccountRegistrationTagMapper(Brand.redZone)

  "NewSegment account registration" should {
    val source = CustomerWithLoginDataProvider.single

    "create tag NewSegment in payload" in {
      // given

      // when
      val payload = mapper.transformPayload()

      // then
      payload shouldEqual Tag.NewSegment.name
    }

    "create tag id" in {
      // given

      // when
      val result = mapper.map(new Tuple2(source.f0, source.f1))

      // then
      val value = result.f1
      value.getAction shouldEqual ActionType.TAG
    }

  }

}