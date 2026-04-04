package stella.common.core

import java.time.OffsetDateTime
import java.time.ZoneOffset

object OffsetDateTimeUtils {
  def asUtc(dateTime: OffsetDateTime): OffsetDateTime =
    if (dateTime.getOffset == ZoneOffset.UTC) dateTime
    else dateTime.atZoneSameInstant(ZoneOffset.UTC).toOffsetDateTime

  def nowUtc(): OffsetDateTime = OffsetDateTime.now(ZoneOffset.UTC)
}
