package net.flipsports.gmx.streaming.sbtech.mappers.v1

import net.flipsports.gmx.streaming.BaseTestSpec
import net.flipsports.gmx.streaming.data.v1.CustomerDetailsDataProvider
import org.apache.flink.api.java.tuple.Tuple2

class CustomerDetailsToKeyedSpec extends BaseTestSpec  {

  "Mapper" should {

    "map user details" in {
      // given
      val source = CustomerDetailsDataProvider.single

      // when
      val result = new CustomerDetailsToKeyed().map(new Tuple2(source.getCustomerID, source))

      // then
      result.f0.getCustomerID.toString shouldBe(CustomerDetailsDataProvider.externalUserId.toString)
      result.f1 shouldBe(source)
    }
  }

}
