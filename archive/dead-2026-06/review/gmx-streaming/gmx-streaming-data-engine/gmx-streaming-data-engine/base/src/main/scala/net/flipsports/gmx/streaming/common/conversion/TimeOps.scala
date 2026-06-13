package net.flipsports.gmx.streaming.common.conversion

import java.time.{Instant, ZoneOffset}

object TimeOps {

  def nowEpochInMilliAtUtc(): Long = Instant.now().atZone(ZoneOffset.UTC).toInstant.toEpochMilli

}
