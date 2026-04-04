package stella.rules.utils

import java.time.OffsetDateTime

import stella.common.core.Clock
import stella.common.core.OffsetDateTimeUtils

/** Allows to verify datetime set by the particular services and also change time without a need to use Thread.sleep */
class AdjustableClock extends Clock {
  private var value = OffsetDateTimeUtils.nowUtc().minusDays(1)

  override def currentUtcOffsetDateTime(): OffsetDateTime = value

  def moveTime(): OffsetDateTime = {
    value = value.plusSeconds(1)
    value
  }
}
