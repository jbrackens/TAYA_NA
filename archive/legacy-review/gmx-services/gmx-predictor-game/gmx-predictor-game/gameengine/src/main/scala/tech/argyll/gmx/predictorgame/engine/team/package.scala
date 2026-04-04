package tech.argyll.gmx.predictorgame.engine

import tech.argyll.gmx.predictorgame.domain.model.EventStatus.EventStatus

package object team {

  case class EventUpdate(id: String, status: EventStatus, homeTeamScore: Option[Int] = None, awayTeamScore: Option[Int] = None, winner: Option[String] = None)

}
