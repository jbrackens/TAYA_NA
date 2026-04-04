package net.flipsports.gmx.streaming.sbtech.mappers.v1

import java.util

import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.data.v1.SettlementDataProvider
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.apache.flink.api.common.functions.util.ListCollector
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.util.Collector

class PartialCashOutDataFilterSpec extends StreamingTestBase {

  class Mapper(brand: Brand) extends SettlementDataToTopupData(brand)

  "Mapper" should {

    "map settled partial cashout" in {
      // given
      val source = SettlementDataProvider.apply("settlementData/settlementdata-partial-cashout-settled.json").single

      // when
      val result = new util.ArrayList[Tuple2[Long, CasinoAndSportBetsTopupData]]()
      val collector: Collector[Tuple2[Long, CasinoAndSportBetsTopupData]] = new ListCollector[Tuple2[Long, CasinoAndSportBetsTopupData]](result)
      new Mapper(Brand.sportNations).flatMap(source, collector)

      // then
      result.size should be(1)
    }


    "filter settled partial cashout" in {
      // given
      val source = SettlementDataProvider.apply("settlementData/settlementdata-partial-cashout-subbet-open.json").single

      // when
      val result = new util.ArrayList[Tuple2[Long, CasinoAndSportBetsTopupData]]()
      val collector: Collector[Tuple2[Long, CasinoAndSportBetsTopupData]] = new ListCollector[Tuple2[Long, CasinoAndSportBetsTopupData]](result)
      new Mapper(Brand.sportNations).flatMap(source, collector)


      // then

      result.size should be(0)
    }



    "map souble bets" in {
      // given
      val source = SettlementDataProvider.apply("settlementData/settlementdata-double-combobets.json").single

      // when
      val result = new util.ArrayList[Tuple2[Long, CasinoAndSportBetsTopupData]]()
      val collector: Collector[Tuple2[Long, CasinoAndSportBetsTopupData]] = new ListCollector[Tuple2[Long, CasinoAndSportBetsTopupData]](result)
      new Mapper(Brand.sportNations).flatMap(source, collector)


      // then
      result.size should be(1)
    }

    "not filter settled partial cashout without reference" in {
      // given
      val source = SettlementDataProvider.apply("settlementData/settlementdata-partial-cashout-subbet-open-without-ref.json").single

      // when
      val result = new util.ArrayList[Tuple2[Long, CasinoAndSportBetsTopupData]]()
      val collector: Collector[Tuple2[Long, CasinoAndSportBetsTopupData]] = new ListCollector[Tuple2[Long, CasinoAndSportBetsTopupData]](result)
      new Mapper(Brand.sportNations).flatMap(source, collector)


      // then
      result.size should be(2)
    }


  }

}
