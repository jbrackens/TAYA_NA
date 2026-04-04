package phoenix.core

import java.time._

trait Clock {
  def currentOffsetDateTime(): OffsetDateTime
  def zone: ZoneId

  def adjustToClockZone(dateTime: OffsetDateTime): OffsetDateTime =
    Clock.adjustToZone(dateTime, zone)
}

object Clock {
  lazy val utcClock: Clock = forZone(ZoneOffset.UTC)
  def forZone(zone: ZoneId): Clock = new ZonedClock(zone)

  private def adjustToZone(time: OffsetDateTime, zone: ZoneId): OffsetDateTime =
    time.withOffsetSameInstant(zone.getRules.getOffset(time.toInstant))

  private final class ZonedClock(override val zone: ZoneId) extends Clock {
    override def currentOffsetDateTime(): OffsetDateTime = OffsetDateTime.now(zone)
  }
}
