package tech.argyll.gmx.predictorgame.common

import java.time.{Clock, LocalDateTime}

class TimeService(val clock: Clock) {
  def getCurrentTime: LocalDateTime = LocalDateTime.ofInstant(clock.instant(), clock.getZone)

}
