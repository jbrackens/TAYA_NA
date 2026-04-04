package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.helper

import akka.NotUsed
import akka.stream.scaladsl.Source
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Response.BaseResponse
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.RouletteStream

trait RouletteStreamAware {
  def rouletteStream: RouletteStream

  def addSource(eventId: String, source: Source[BaseResponse, NotUsed]): Unit = {
    rouletteStream.addEventSource(eventId, source)
  }
}
