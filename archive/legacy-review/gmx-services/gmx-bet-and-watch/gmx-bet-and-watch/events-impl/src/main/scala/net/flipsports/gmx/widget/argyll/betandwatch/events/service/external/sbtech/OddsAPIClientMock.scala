package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech

import java.time.LocalDateTime

import play.api.libs.json.{JsValue, Json}

import scala.concurrent.Future

class OddsAPIClientMock extends OddsAPIClient {

  def callMarkets(to: LocalDateTime): Future[JsValue] =
    Future.successful(
      Json.parse(getClass.getClassLoader.getResourceAsStream("mock/sbtech_odds_markets.json"))
    )

  override def callCountries(): Future[JsValue] =
    Future.successful(
      Json.parse(getClass.getClassLoader.getResourceAsStream("mock/sbtech_odds_countries.json"))
    )
}
