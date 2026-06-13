package phoenix.punters.domain

import java.time.OffsetDateTime

import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext.SessionId

final case class Session(
    sessionId: SessionId,
    punterId: PunterId,
    startTime: OffsetDateTime,
    endTime: Option[OffsetDateTime])
