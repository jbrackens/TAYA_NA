package stella.common.core

import java.time.OffsetDateTime
import java.time.ZoneOffset

trait Clock {
  def currentUtcOffsetDateTime(): OffsetDateTime
}

object JavaOffsetDateTimeClock extends Clock {
  override def currentUtcOffsetDateTime(): OffsetDateTime = OffsetDateTime.now(ZoneOffset.UTC)
}

/** Allows to verify datetime set by the particular services and also change time without a need to use Thread.sleep */
class AdjustableClock extends Clock {
  private var value = OffsetDateTime.now(ZoneOffset.UTC).minusDays(1)

  override def currentUtcOffsetDateTime(): OffsetDateTime = value

  def moveTime(): OffsetDateTime = {
    value = value.plusSeconds(1)
    value
  }
}
