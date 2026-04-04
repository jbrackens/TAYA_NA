package eeg.waysun.events.aggregation.mappers

import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class StringValueSpec extends StreamingTestBase {

  "string value" should {

    "when is float should 0" in {
      // given
      val value = "0"

      // when
      val result = StringValue(value)

      // then
      result.toFloat() must be(0f)
    }

  }
}
