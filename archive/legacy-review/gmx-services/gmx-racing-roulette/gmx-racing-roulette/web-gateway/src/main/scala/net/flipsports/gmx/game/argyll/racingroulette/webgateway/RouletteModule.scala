package net.flipsports.gmx.game.argyll.racingroulette.webgateway

import com.softwaremill.sttp.SttpBackend
import com.softwaremill.sttp.asynchttpclient.future.AsyncHttpClientFutureBackend
import net.flipsports.gmx.webapiclient.sbtech.betting.config.BettingAPIConfig
import net.flipsports.gmx.webapiclient.sbtech.betting.{BettingAPIClient, BettingAPIClientImpl}

import scala.concurrent.Future

trait RouletteModule extends BaseModule {
  implicit val backend: SttpBackend[Future, Nothing] = AsyncHttpClientFutureBackend()

  val bettingConfig = BettingAPIConfig(configuration.underlying)

  val bettingAPIClient: BettingAPIClient = new BettingAPIClientImpl(bettingConfig)
}
