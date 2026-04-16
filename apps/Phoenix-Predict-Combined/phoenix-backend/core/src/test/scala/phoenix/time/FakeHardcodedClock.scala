package phoenix.time

import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZoneOffset

import phoenix.core.Clock

final class FakeHardcodedClock(
    var fixedTime: OffsetDateTime = OffsetDateTime.ofInstant(Instant.ofEpochMilli(1610974288000L), ZoneOffset.UTC),
    timeZone: ZoneId = ZoneOffset.UTC)
    extends Clock {

  override def currentOffsetDateTime(): OffsetDateTime = fixedTime

  override val zone: ZoneId = timeZone

  def setFixedTime(newTime: OffsetDateTime): Unit =
    fixedTime = adjustToClockZone(newTime)
}
