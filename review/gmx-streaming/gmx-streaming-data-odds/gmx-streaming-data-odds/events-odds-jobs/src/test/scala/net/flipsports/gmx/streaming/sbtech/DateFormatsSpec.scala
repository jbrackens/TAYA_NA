package net.flipsports.gmx.streaming.sbtech

import com.typesafe.scalalogging.LazyLogging
import org.scalatest.MustMatchers.convertToAnyMustWrapper
import org.scalatest.concurrent.Eventually
import net.flipsports.gmx.streaming.common.conversion.DateFormats
import org.scalatest.{Matchers, OptionValues, WordSpec}

class DateFormatsSpec extends WordSpec with OptionValues with Matchers with LazyLogging with Eventually {


  "Data Formats" should {

    "reformat date" in {

      val source = 1612011444


      val result = DateFormats.withAddedTimeAtUtc(source)


      1612011444000l must be (result.toInstant.toEpochMilli)

    }


  }

}
