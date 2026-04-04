package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech

import java.time.LocalDateTime

import play.api.libs.json.{JsValue, Json}

import scala.concurrent.Future

class DataAPIClientMock extends DataAPIClient {

  override def callPlayerDetails(userId: String): Future[JsValue] = {
    Future.successful(
      Json.parse(getClass.getClassLoader.getResourceAsStream("mock/sbtech_data_playerdetails.json"))
    )
  }

  override def callOpenBets(from: LocalDateTime, to: LocalDateTime): Future[JsValue] = {
    Future.successful(
      Json.parse(getClass.getClassLoader.getResourceAsStream("mock/sbtech_data_openbets.json"))
    )
  }
}
