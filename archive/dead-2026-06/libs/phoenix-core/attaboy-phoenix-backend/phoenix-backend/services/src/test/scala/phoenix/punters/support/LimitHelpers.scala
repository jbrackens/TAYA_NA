package phoenix.punters.support

import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneOffset

import phoenix.punters.domain.CurrentAndNextLimit
import phoenix.punters.domain.CurrentAndNextLimits
import phoenix.punters.domain.EffectiveLimit
import phoenix.punters.domain.Limits

object LimitHelpers {
  def noPeriodicLimits[V: Ordering]: CurrentAndNextLimits[V] =
    limitsToAlwaysEffectivePeriodicLimits(Limits.none[V])

  def limitsToAlwaysEffectivePeriodicLimits[V](depositLimits: Limits[V]): CurrentAndNextLimits[V] = {
    val alwaysEffective = OffsetDateTime.ofInstant(Instant.EPOCH, ZoneOffset.UTC)
    CurrentAndNextLimits(
      CurrentAndNextLimit(EffectiveLimit(depositLimits.daily, since = alwaysEffective), next = None),
      CurrentAndNextLimit(EffectiveLimit(depositLimits.weekly, since = alwaysEffective), next = None),
      CurrentAndNextLimit(EffectiveLimit(depositLimits.monthly, since = alwaysEffective), next = None))
  }
}
