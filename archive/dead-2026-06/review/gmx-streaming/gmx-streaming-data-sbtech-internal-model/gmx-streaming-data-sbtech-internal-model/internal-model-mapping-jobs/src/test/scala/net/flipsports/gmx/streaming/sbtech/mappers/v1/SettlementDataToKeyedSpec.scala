package net.flipsports.gmx.streaming.sbtech.mappers.v1

import net.flipsports.gmx.streaming.BaseTestSpec
import net.flipsports.gmx.streaming.data.v1.SettlementDataProvider

class SettlementDataToKeyedSpec extends BaseTestSpec  {

  "Mapper" should {

    "map user details" in {
      // given
      val source = SettlementDataProvider.apply.single

      // when
      val result = new SettlementDataToKeyed().map(source)

      // then
      result.f0.getCustomerId.toString shouldBe("19948956")
      result.f1 shouldBe(source)
    }
  }

}
