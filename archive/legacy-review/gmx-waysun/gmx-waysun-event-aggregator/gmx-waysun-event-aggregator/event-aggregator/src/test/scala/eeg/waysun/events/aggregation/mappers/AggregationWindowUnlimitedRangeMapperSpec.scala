package eeg.waysun.events.aggregation.mappers

import eeg.waysun.events.aggregation.Types
import eeg.waysun.events.aggregation.Types.AggregationResult.{KeyType, KeyedType, ValueType}
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.apache.flink.api.common.functions.MapFunction
import stella.dataapi.aggregation.AggregationValues

class AggregationWindowUnlimitedRangeMapperSpec extends StreamingTestBase {

  val objectUnderTest: MapFunction[KeyedType, KeyedType] = AggregationWindowUnlimitedRangeMapper()
  import Helpers.{`given`, `number between Long.MinValue and Long.MaxValue`}

  "getWindowRangeStartUTC" should {
    "be null" in {
      // given
      val windowRange: Long = Long.MinValue
      //when
      val result: KeyedType = objectUnderTest.map(given(windowRangeStartUTC = windowRange, windowRangeEndUTC = 1L))
      //then
      result.value.getWindowRangeStartUTC shouldBe null
    }
    "be unchanged" in {
      // given
      val windowRange: Long = `number between Long.MinValue and Long.MaxValue`
      //when
      val result: KeyedType = objectUnderTest.map(given(windowRangeStartUTC = windowRange, windowRangeEndUTC = 1L))
      //then
      result.value.getWindowRangeStartUTC shouldBe windowRange
    }
  }

  "getWindowRangeEndUTC" should {
    "be null" in {
      // given
      val windowRange: Long = Long.MaxValue
      //when
      val result: KeyedType = objectUnderTest.map(given(windowRangeStartUTC = 1L, windowRangeEndUTC = windowRange))
      //then
      result.value.getWindowRangeEndUTC shouldBe null
    }
    "be unchanged" in {
      // given
      val windowRange: Long = `number between Long.MinValue and Long.MaxValue`
      //when
      val result: KeyedType = objectUnderTest.map(given(windowRangeStartUTC = 1L, windowRangeEndUTC = windowRange))
      //then
      result.value.getWindowRangeEndUTC shouldBe windowRange
    }
  }

  object Helpers {
    def given(windowRangeStartUTC: Long, windowRangeEndUTC: Long): Types.AggregationResult.KeyedType =
      new Types.AggregationResult.KeyedType(
        new KeyType("aggregationRuleId", "companyId", "groupByFieldValue"),
        new ValueType(
          windowRangeStartUTC,
          windowRangeEndUTC,
          AggregationValues.newBuilder().setCustom("custom").setMax(1).setMin(1).setCount(1).setSum(1).build()))

    def `number between Long.MinValue and Long.MaxValue`: Long = {
      java.util.concurrent.ThreadLocalRandom.current().nextLong(Long.MinValue + 1, Long.MaxValue - 1)
    }
  }
}
