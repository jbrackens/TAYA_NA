package net.flipsports.gmx.racingroulette.utils

import com.softwaremill.sttp._
import com.softwaremill.sttp.asynchttpclient.future.AsyncHttpClientFutureBackend
import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.racingroulette.utils.external.{OddsFeedClient, RouletteClient}
import play.api.libs.json.{JsArray, JsValue, _}

import scala.concurrent.ExecutionContext.Implicits
import scala.concurrent.duration._
import scala.concurrent.{Await, ExecutionContext, Future}

/**
 * Checks if odds returned by HTTP API (Json Feed) matches the odds available in RR backend (received from Kafka SD topics).
 */
object OddsChecker extends LazyLogging
  with RouletteClient
  with OddsFeedClient {

  implicit lazy val backend: SttpBackend[Future, Nothing] = AsyncHttpClientFutureBackend()
  implicit lazy val ex: ExecutionContext = Implicits.global

  def main(args: Array[String]): Unit = {
    val referenceData = Await.result(prepareGamesWithOdds(), 10.seconds)

    logger.info(s"ALL GAMES: ${referenceData.size}")
    val gamesFiltered = referenceData.filter(_.isDefined).map(_.get)
    logger.info(s"FILTERED GAMES: ${gamesFiltered.size}")

    gamesFiltered.map(item => {
      val gameId = item.gameId.toString
      val startTime = (item.gameDef \ "GameDate").as[String]
      logger.info(s"[$gameId] Processing game ${item.location} at $startTime")
      val result = getRouletteEvent(gameId)
        .map(event =>
          event.map(e => {
            compareOdds(gameId, item, e)
          }))
      Await.result(result, 10.seconds)
    })
  }

  private def prepareGamesWithOdds(): Future[Seq[Option[OddsFeedGame]]] = {
    for {
      marketsResp <- getMarkets
      oddsResp <- getOdds
    } yield {
      val gamesDef = (marketsResp \\ "Leagues").head.as[JsArray].value
        .flatMap(league => {
          val location = (league \ "LeagueName").as[String]
          (league \ "Games").as[JsArray].value
            .map(game => {
              val gamePrune = game.transform((__ \ "Markets").json.prune).get
              val gameId = (gamePrune \ "GameID").as[Int]
              val raceCard = (game \ "Markets").as[JsArray].value.find(isRaceCardMarket)
              (gameId, location, gamePrune, raceCard)
            })
        })

      val gamesOdds = (oddsResp \ "Odds").as[JsArray].value
        .map(game => {
          val raceCard = (game \ "Markets").as[JsArray].value.find(isRaceCardMarket)
          val gameId = (game \ "GameID").as[Int]
          (gameId, raceCard)
        })

      gamesDef.map(game => {
        val odds = gamesOdds.find(_._1 == game._1)
        odds.map(odds => {
          if (game._4.isEmpty || odds._2.isEmpty) {
            logger.info(s"[${game._1}] Could not find RaceCard(3410022) Market in def and odds")
            None
          } else {
            Some(OddsFeedGame(game._1, game._2, game._3, mergeParticipantWithOdds((game._4.get \ "Lines").as[JsArray].value, (odds._2.get \ "Lines").as[JsArray].value)))
          }
        })
          .getOrElse({
            logger.info(s"[${game._1}] Could not find ODDS")
            None
          })
      })
    }
  }

  private def isRaceCardMarket(market: JsValue): Boolean = {
    (market \ "MarketTypeID").as[Int] == 3410022
  }

  private def mergeParticipantWithOdds(participants: Seq[JsValue], odds: Seq[JsValue]): Seq[JsObject] = {
    participants.map(participant => {
      val participantId = (participant \ "LineIntID").as[Int]
      val odd = odds.find(odd => (odd \ "LineIntID").as[Int] == participantId).get
      participant.as[JsObject] ++ odd.as[JsObject]
    })
  }

  def compareOdds(eventId: String, apiGame: OddsFeedGame, rouletteEvent: JsValue): Unit = {
    logger.debug(s"[$eventId] RAW $apiGame vs $rouletteEvent")

    val rouletteOdds = (rouletteEvent \ "selections").as[Map[String, JsValue]].values.map(item =>
      LineWithOdds((item \\ "bettingId").head.as[String],
        (item \\ "displayOdds").head.as[String],
        (item \\ "sbtechUpdateTime").head.as[Long],
        (item \\ "flinkProcessedTime").head.as[Long])
    )

    val validations = apiGame.participants.map(referenceValue => {
      val participantId = (referenceValue \ "LineIntID").as[Int].toString
      val participantName = (referenceValue \ "LineName").as[String]
      val participantOdds = (referenceValue \ "Odds").as[String]

      val matchToCheck = rouletteOdds.find(candidate => candidate.id.contains(participantId))

      matchToCheck.map(toCheck =>
        if (!toCheck.odds.equals(participantOdds))
          Some(s"ODDS NOT MATCHING FOR SELECTION $participantId / $participantName / EXPECTED: $participantOdds ACTUAL: ${toCheck.odds} / SBTech ${toCheck.sbtechUpdateTime} / FLINK ${toCheck.flinkProcessedTime} / diff ${toCheck.flinkProcessedTime - toCheck.sbtechUpdateTime}s")
        else
          None
      ).getOrElse(Some(s"NO ODDS FOUND FOR SELECTION $participantId / $participantName / "))
    })

    //TODO check norunner
    //    {
    //      "LineIntID": 781084368,
    //      "Odds": "100/1",
    //      "LineStateName": "NR"
    //    },


    val errors = validations.filter(_.isDefined).map(_.get)
    if (errors.isEmpty)
      logger.info(s"[$eventId] All odds MATCH")
    else
      logger.warn(s"[$eventId] FAILED TO MATCH ODDS:\n${errors.mkString("\n")}")
  }

  case class OddsFeedGame(gameId: Int, location: String, gameDef: JsValue, participants: Seq[JsValue])

  case class LineWithOdds(id: String, odds: String, sbtechUpdateTime: Long, flinkProcessedTime: Long)

}
