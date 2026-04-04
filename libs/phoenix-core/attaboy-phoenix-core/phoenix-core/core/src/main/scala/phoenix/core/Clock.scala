package phoenix.core

import java.time._

trait Clock {

  def currentInstant(): Instant = currentZonedDateTime().toInstant

  def currentZonedDateTime(): ZonedDateTime

  def currentOffsetDateTime(): OffsetDateTime
}

class UtcClock extends Clock {

  private val defaultTimeZone: ZoneId = ZoneOffset.UTC

  override def currentZonedDateTime(): ZonedDateTime = ZonedDateTime.now(defaultTimeZone)

  override def currentOffsetDateTime(): OffsetDateTime = currentZonedDateTime().toOffsetDateTime
}
