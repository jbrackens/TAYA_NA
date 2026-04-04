package net.flipsports.gmx.streaming.sbtech.mappers.v1

import net.flipsports.gmx.streaming.BaseTestSpec
import net.flipsports.gmx.streaming.data.v1.CasinoBetDataProvider
import org.apache.flink.api.java.tuple.Tuple2

class CasinoBetToKeyedSpec extends BaseTestSpec {

  "CasinoBetToTopupData mapper" should {

    "Map bet" in {
      // given
      val betPOJO = CasinoBetDataProvider.single

      // when
      val result = new CasinoBetToKeyed().map(new Tuple2(betPOJO.getCustomerID.toLong, betPOJO))

      // then
      result.f0.getCustomerID shouldBe(CasinoBetDataProvider.CustomerID)
      result.f1 shouldBe betPOJO
    }
  }

}
