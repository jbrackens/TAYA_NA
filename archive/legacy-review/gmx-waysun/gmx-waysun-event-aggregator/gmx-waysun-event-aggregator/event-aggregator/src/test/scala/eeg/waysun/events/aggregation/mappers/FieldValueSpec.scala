package eeg.waysun.events.aggregation.mappers

import stella.dataapi.validators.FieldType
import eeg.waysun.events.aggregation.streams.dto.Field
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class FieldValueSpec extends StreamingTestBase {

  "field value" should {

    "be extracted from boolean to 1" in {
      // given
      val field = Field("sample", FieldType.Boolean.name, "true")

      //when
      val value = FieldValue(field)
      // then
      value.asFloat must be(1f)
      value.asString must be("1")

    }
    "be extracted from boolean to 0" in {
      // given
      val field = Field("sample", FieldType.Boolean.name, "false")

      //when
      val value = FieldValue(field)
      // then
      value.asFloat must be(0f)
      value.asString must be("0")
    }
    "be extracted from float" in {
      // given
      val field = Field("sample", FieldType.Float.name, "0")

      //when
      val value = FieldValue(field)
      // then
      value.asFloat must be(0f)
      value.asString must be("0")
    }
    "be extracted from string" in {
      // given
      val field = Field("sample", FieldType.String.name, "bla")

      //when
      val value = FieldValue(field)
      // then
      value.asFloat must be(0f)
      value.asString must be("bla")
    }
    "be extracted from integer" in {
      // given
      val field = Field("sample", FieldType.Integer.name, "0")

      //when
      val value = FieldValue(field)
      // then
      value.asFloat must be(0f)
      value.asString must be("0")
    }

  }

}
