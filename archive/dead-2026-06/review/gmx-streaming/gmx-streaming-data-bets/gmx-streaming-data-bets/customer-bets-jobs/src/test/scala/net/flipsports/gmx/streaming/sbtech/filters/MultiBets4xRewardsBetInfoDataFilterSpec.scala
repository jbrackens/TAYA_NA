package net.flipsports.gmx.streaming.sbtech.filters

import net.flipsports.gmx.streaming.data.v1.SettlementDataProvider
import net.flipsports.gmx.streaming.sbtech.filters.v1.MultiBets4xRewardsBetInfoDataFilter
import net.flipsports.gmx.streaming.sbtech.mappers.DateFormats
import net.flipsports.gmx.streaming.tests.StreamingTestBase

class MultiBets4xRewardsBetInfoDataFilterSpec  extends StreamingTestBase {


  "Casino bet filter" must {

    val objectUnderTest = new MultiBets4xRewardsBetInfoDataFilter

    "reject old bet" in {
      // given
      val source = SettlementDataProvider.apply.single

      // when
      val result = objectUnderTest.input.filter(source)

      // then
      result should be(false)
    }

    "should accept bet" in {
      // given
      val source = SettlementDataProvider.apply.single
      source.f1.getPurchase.setCreationDate(DateFormats.fromIso("10/02/2020 00:02:00 AM").toInstant.toEpochMilli)

      // when
      val result = objectUnderTest.input.filter(source)

      // then
      result should be(true)
    }


    "should reject after end promotion" in {
      // given
      val source = SettlementDataProvider.apply.single
      source.f1.getPurchase.setCreationDate(DateFormats.fromIso("10/04/2020 11:59:01 PM").toInstant.toEpochMilli)

      // when
      val result = objectUnderTest.input.filter(source)

      // then
      result should be(false)
    }

  }


}
