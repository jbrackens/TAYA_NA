package stella.events.utils

import java.time.OffsetDateTime
import java.time.ZoneOffset

import stella.common.core.Clock

case class ConstantClock(value: OffsetDateTime) extends Clock {
  override def currentUtcOffsetDateTime(): OffsetDateTime = value
}

object ConstantClock {
  def now(): ConstantClock = ConstantClock(OffsetDateTime.now(ZoneOffset.UTC))
}
