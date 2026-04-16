package phoenix.punters.exclusion.domain

import java.time.OffsetDateTime

import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState.SelfExclusionDuration

final case class SelfExcludedPunter(
    punterId: PunterId,
    exclusionDuration: SelfExclusionDuration,
    excludedAt: OffsetDateTime)
