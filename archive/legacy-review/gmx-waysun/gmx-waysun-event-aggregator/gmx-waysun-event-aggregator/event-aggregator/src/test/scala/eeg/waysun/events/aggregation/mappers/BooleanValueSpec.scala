package eeg.waysun.events.aggregation.mappers

import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class BooleanValueSpec extends StreamingTestBase {

  "field value" should {

    "be extracted from true to 1" in {
      // given
      val item = true

      // when
      val result = BooleanValue(item)

      // then
      result.asInt() must be(1)
    }

    "be extracted from true to 0" in {
      // given
      val item = false

      // when
      val result = BooleanValue(item)

      // then
      result.asInt() must be(0)
    }
  }
}
