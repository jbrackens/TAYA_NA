package phoenix.oddin.infrastructure.akkastreams

import akka.stream.scaladsl.Flow

import phoenix.dataapi.shared.FixtureStatus
import phoenix.dataapi.shared.Header
import phoenix.dataapi.shared.MatchStatusUpdate
import phoenix.dataapi.shared.Score
import phoenix.oddin.domain.CommonOddinStreamingApi.MatchStatusUpdateFlow
import phoenix.oddin.domain.OddinStreamingApi.OddsChangeMessage
import phoenix.oddin.domain.{FixtureStatus => OddinFixtureStatus}

object CommonMatchStatusUpdateFlow {

  def apply(): MatchStatusUpdateFlow = {
    Flow[OddsChangeMessage].map(buildMatchStatusUpdateEvent).filter(_.isDefined).map(_.get)
  }

  private def buildMatchStatusUpdateEvent(elem: OddsChangeMessage): Option[MatchStatusUpdate] = {
    elem.payload.sportEventStatusChange.map { statusChange =>
      MatchStatusUpdate(
        Header(elem.correlationId.value.toString, elem.receivedAt.value.toInstant, "oddin"),
        namespacedFixtureId = elem.payload.marketChange.sportEventId.namespacedPhoenixFixtureId.value,
        score = Some(Score(statusChange.homeScore.value.toString, statusChange.awayScore.value.toString)),
        matchStatus = toFixtureStatus(statusChange.matchStatus))
    }
  }

  private def toFixtureStatus(state: OddinFixtureStatus): FixtureStatus =
    state match {
      case OddinFixtureStatus.NOT_STARTED | OddinFixtureStatus.DELAYED                         => FixtureStatus.PreGame
      case OddinFixtureStatus.POSTPONED                                                        => FixtureStatus.Postponed
      case OddinFixtureStatus.LIVE                                                             => FixtureStatus.InPlay
      case OddinFixtureStatus.SUSPENDED | OddinFixtureStatus.INTERRUPTED                       => FixtureStatus.BreakInPlay
      case OddinFixtureStatus.ENDED | OddinFixtureStatus.FINALIZED | OddinFixtureStatus.CLOSED => FixtureStatus.PostGame
      case OddinFixtureStatus.CANCELLED | OddinFixtureStatus.ABANDONED                         => FixtureStatus.GameAbandoned
      case _                                                                                   => FixtureStatus.Unknown
    }

}
