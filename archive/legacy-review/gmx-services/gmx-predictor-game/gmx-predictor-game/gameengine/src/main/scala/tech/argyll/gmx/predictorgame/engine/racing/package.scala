package tech.argyll.gmx.predictorgame.engine

import java.time.ZonedDateTime

import tech.argyll.gmx.predictorgame.domain.model.EventStatus.EventStatus
import tech.argyll.gmx.predictorgame.domain.model.racing.HorseStatus.HorseStatus

package object racing {

  trait HorseRacingUpdate {
    val raceId: Long
  }

  case class HorseRacingEventUpdate(raceId: Long,
                                    location: String,
                                    startTime: ZonedDateTime,
                                    status: EventStatus) extends HorseRacingUpdate

  case class HorseRacingParticipantUpdate(raceId: Long,
                                          horseId: Long,
                                          status: HorseStatus,
                                          finishPosition: Option[Int]) extends HorseRacingUpdate

}