package gmx.widget.siteextentions.datafeed.service.sportevents.flow

import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneOffset

import gmx.common.scala.core.time.TimeUtils.TimeUtilsLongOps

package object converter {

  private val referenceDate = OffsetDateTime.of(2021, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC).toInstant.toEpochMilli

  def throwConverterException[T](desc: String): T = {
    throw new ConverterException(desc)
  }

  /**
   * Tries to understand if timestamp is in seconds or milliseconds by comparing to some day not far in the past.
   * All dates should be in future of reference date, if it's before then it's probably in seconds.
   */
  def normalizeTimestamp(input: Long): Instant = {
    if (input < referenceDate) {
      (input * 1000).toInstant
    } else {
      input.toInstant
    }
  }
}
