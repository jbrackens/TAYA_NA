package net.flipsports.gmx.streaming.common.job.streams.dto

import net.flipsports.gmx.streaming.common.BaseTestSpec
import org.apache.flink.api.java.utils.ParameterTool
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class ParameterSpec extends BaseTestSpec {

  "Parameter extractor" should {

    "extract multiple paramters" in {
      // given
      val intField = Parameter.intParameter("a", 0)
      val booleanField = Parameter.booleanParameter("b", false)
      val longField = Parameter.longParameter("l", 1l)
      val doubleField = Parameter.doubleParameter("d", 0.1)
      val stringField = Parameter.stringParameter("s", "blabla")
      val tool = ParameterTool.fromArgs(Array("--a", "1", "--b", "true", "--l","3", "--d","0.5", "--s", "cla"))

      // then
      Parameter.extract(tool, booleanField) mustBe(true)
      Parameter.extract(tool, intField) mustBe(1)
      Parameter.extract(tool, longField) mustBe(3l)
      Parameter.extract(tool, doubleField) mustBe(0.5)
      Parameter.extract(tool, stringField) mustBe("cla")

    }

  }
}
