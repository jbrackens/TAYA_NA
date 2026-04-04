package net.flipsports.gmx.streaming.sbtech.mappers.v1

import java.util

import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.data.v1.SettlementDataProvider
import net.flipsports.gmx.streaming.sbtech.mappers.OperationTypes
import net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators.CommonTransformation
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.apache.flink.api.common.functions.util.ListCollector
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.util.Collector

class SettlementDataToTopupDataSpec extends StreamingTestBase  {

  class Mapper(brand: Brand) extends SettlementDataToTopupData(brand)

  "Mapper" should {

    "map user details" in {
      // given
      val source = SettlementDataProvider.apply.single

      // when
      val collection = new util.ArrayList[Tuple2[Long, CasinoAndSportBetsTopupData]]()
      val collector: Collector[Tuple2[Long, CasinoAndSportBetsTopupData]] = new ListCollector[Tuple2[Long, CasinoAndSportBetsTopupData]](collection)
      new Mapper(Brand.redZone).flatMap(source, collector)


      // then
      val result = collection.get(0)
      result.f0 = 20237719
      result.f1.getAmount should be(1.5)
      result.f1.getCompanyId should be(Brand.redZone.sourceBrand.uuid)
      result.f1.getCreatedDate should be(1553187864239l)
      result.f1.getExternalTransactionId should be("636887846644036359")
      result.f1.getExternalUserId should be("19948956")
      result.f1.getOperationSubtype should be(OperationTypes.STD)
      result.f1.getCreatedDateValue should be("2019-03-21T17:04:24Z")
    }


    "should divide stake with double part" in {

      // given
      val source = SettlementDataProvider.apply.single.f1

      val bet = source.getPurchase.getBets.get(0)
      bet.setStake(170036l)

      CommonTransformation.toBetToStake(bet).asDouble() should be(17.0036)
    }
  }

}
