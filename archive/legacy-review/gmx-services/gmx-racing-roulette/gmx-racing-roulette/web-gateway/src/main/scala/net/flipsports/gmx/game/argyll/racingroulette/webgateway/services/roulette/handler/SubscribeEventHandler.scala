package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.handler

import akka.event.LoggingAdapter
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Metadata.RequestMetadata
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Operation.EventUpdate
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Request.SubscribeEventReq
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Response._
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.helper.{EventActorAware, EventUpdateOps, RouletteStreamAware}

import scala.concurrent.{ExecutionContext, Future}

trait SubscribeEventHandler extends EventActorAware with RouletteStreamAware with EventUpdateOps {

  def logger: LoggingAdapter

  def handleSubscribe(msg: SubscribeEventReq)(implicit ec: ExecutionContext): Future[BaseResponse] = {
    logger.debug(s"Subscribing to event: ${msg.meta.eventId}")

    val eventUpdatesMetadata = RequestMetadata(None, EventUpdate, msg.meta.eventId, msg.meta.simulateError)
    for {
      eventStream <- getEventStream(msg.meta)
      updatesStream = eventStream.eventUpdates.map(change => buildEventUpdateResp(eventUpdatesMetadata, change))
      _ = addSource(msg.meta.eventId, updatesStream)
      state <- getEventState(msg.meta)
        .map(event => buildEventUpdateResp(msg.meta, event.state))
    } yield state
  }
}
