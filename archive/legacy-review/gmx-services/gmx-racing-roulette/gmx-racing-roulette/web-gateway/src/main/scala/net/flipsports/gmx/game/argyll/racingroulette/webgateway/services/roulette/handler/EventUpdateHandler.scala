package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.handler

import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Request.EventUpdateReq
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Response._
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.helper.{EventActorAware, EventUpdateOps}

import scala.concurrent.{ExecutionContext, Future}

trait EventUpdateHandler extends EventActorAware with EventUpdateOps {

  def handleEventUpdate(msg: EventUpdateReq)(implicit ec: ExecutionContext): Future[BaseResponse] = {
    getEventState(msg.meta)
      .map(event => buildEventUpdateResp(msg.meta, event.state))
  }
}
