package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream

import net.flipsports.gmx.common.mdc.MDCCorrelationUUID

object Elements {

  sealed trait StateUpdate {
    def eventId: String
  }

  case class SelectionUpdate(uuid: String,
                             eventId: String,
                             bettingId: String,
                             participantId: String,
                             marketId: String,
                             status: String,
                             trueOdds: Double,
                             displayOdds: Map[String, String],
                             lastUpdateDateTime: Long,
                             createdDate: Long) extends MDCCorrelationUUID with StateUpdate {
    override def extractUUID: String = uuid
  }

  case class EventsUpdate(uuid: String,
                          eventId: String,
                          eventType: String,
                          eventName: String,
                          leagueName: String,
                          startEventDate: Long,
                          status: String,
                          participants: Seq[ParticipantUpdate] = Seq(),
                          lastUpdateDateTime: Long,
                          createdDate: Long)
    extends MDCCorrelationUUID with StateUpdate {
    override def extractUUID: String = uuid
  }

  case class ParticipantUpdate(uuid: String,
                               id: String,
                               name: String,
                               runnerNumber: String,
                               runnerStatus: String) extends MDCCorrelationUUID {

    override def extractUUID: String = uuid
  }

  case class MarketUpdate(uuid: String,
                          id: String,
                          eventId: String,
                          marketTypeId: String,
                          lastUpdateDateTime: Long,
                          createdDate: Long) extends MDCCorrelationUUID with StateUpdate {
    override def extractUUID: String = uuid
  }

}
