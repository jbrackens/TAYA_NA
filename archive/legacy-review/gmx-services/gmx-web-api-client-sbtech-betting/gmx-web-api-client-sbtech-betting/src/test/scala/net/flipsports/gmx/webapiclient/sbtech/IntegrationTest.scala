package net.flipsports.gmx.webapiclient.sbtech

import com.softwaremill.sttp.SttpBackend
import com.softwaremill.sttp.asynchttpclient.future.AsyncHttpClientFutureBackend
import com.typesafe.config.{ ConfigFactory, ConfigValueFactory }
import net.flipsports.gmx.webapiclient.sbtech.betting.config.BettingAPIConfig
import net.flipsports.gmx.webapiclient.sbtech.betting.dto.{ Bet, PlaceBetsRequest, Selection, SelectionMapped }
import net.flipsports.gmx.webapiclient.sbtech.betting.{ BettingAPIClient, BettingAPIClientImpl }

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration._
import scala.concurrent.{ Await, Future }

/**
 * Class used for "manual" testing of betting API
 */
object IntegrationTest {

  implicit val backend: SttpBackend[Future, Nothing] = AsyncHttpClientFutureBackend()

  val config = BettingAPIConfig(
    ConfigFactory
      .load()
      .withValue(
        "app.external.sbtech.betting-api.url",
        ConfigValueFactory.fromAnyRef("https://stgapi.sbtech.com/sportnation/betting/v2")))

  val bettingAPIClient: BettingAPIClient = new BettingAPIClientImpl(config)

  def main(args: Array[String]): Unit = {
    val selectionId1 = "0QA74045298#861922439_22L200413Q1873167Q2-1"
    val trueOdds1 = 15.0
    val displayOdds1 = "14/1"
    val stake1 = 0.40

    val selectionId2 = "0QA74045298#861929913_22L200413Q1873170Q2-1"
    val trueOdds2 = 23.0
    val displayOdds2 = "22/1"
    val stake2 = 0.10

    val req = PlaceBetsRequest(
      selections =
        Seq(
          Selection(selectionId1, trueOdds1, displayOdds1),
          Selection(selectionId2, trueOdds2, displayOdds2)
        ),
      bets = Seq(
        Bet(trueOdds1, displayOdds1, Seq(SelectionMapped(selectionId1)), stake1, trueOdds1 * stake1),
        Bet(trueOdds2, displayOdds2, Seq(SelectionMapped(selectionId2)), stake2, trueOdds2 * stake2)
      ))

    val response = bettingAPIClient.callPlaceBets("JWT_TOKEN_FROM_PAGE", req)

    Await.result(response, 30.seconds)
  }
}
