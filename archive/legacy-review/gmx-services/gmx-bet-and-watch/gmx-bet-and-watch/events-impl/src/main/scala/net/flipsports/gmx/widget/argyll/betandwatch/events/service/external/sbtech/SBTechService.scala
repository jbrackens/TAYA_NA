package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech

import java.time.{LocalDateTime, ZoneOffset}

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.common.internal.partner.sbtech.cons.{SBTechBetType, SBTechLineType, SBTechSportType}
import net.flipsports.gmx.common.internal.scala.core.exception.ExternalCallException
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech.DataAPIClientConverters._
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech.OddsAPIClientConverters._
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech.dto._
import play.api.libs.json.JsValue

import scala.concurrent.{ExecutionContext, Future}

class SBTechService(oddsAPIClient: OddsAPIClient,
                    dataAPIClient: DataAPIClient)
                   (implicit ec: ExecutionContext)
  extends LazyLogging {

  @throws(classOf[ExternalCallException])
  def getCountries(): Future[Seq[Country]] = {
    oddsAPIClient.callCountries()
      .map(responseJSON => {
        val countries = responseJSON("Countries").as[List[JsValue]]
        countries.map(_.as[Country])
      })
  }

  @throws(classOf[ExternalCallException])
  def getAvailableEvents(to: LocalDateTime): Future[Seq[InLeagueGame]] = {
    oddsAPIClient.callMarkets(to)
      .map(responseJSON => {
        val sports = responseJSON("Sports").as[List[JsValue]]
        val horseRacingEvents = convertSport(sports, SBTechSportType.HORSE_RACING)
        val greyhoundsEvents = convertSport(sports, SBTechSportType.GREYHOUNDS)

        horseRacingEvents ++ greyhoundsEvents
      })
  }

  private def convertSport(input: List[JsValue], sport: SBTechSportType) = {
    input
      .filter(candidate => candidate("SportID").as[Int] == sport.getSbtechId)
      .flatMap(_ ("Leagues").as[List[JsValue]])
      .flatMap(l => {
        val league = l.as[League]
        l("Games").as[List[Game]]
          .map(g => InLeagueGame(sport, league, g))
      })
  }

  @throws(classOf[ExternalCallException])
  def getUserDetails(userId: String): Future[UserDetails] = {
    dataAPIClient.callPlayerDetails(userId)
      .map(responseJSON => {
        val users = responseJSON("PlayerDetails").as[List[UserDetails]]
        users match {
          case user :: _ => user
          case Nil => throwServiceException(s"User not found in DataAPI for '$userId'")
        }
      })
  }

  private def throwServiceException(msg: String): UserDetails = {
    throw new SBTechServiceException(msg)
  }

  @throws(classOf[ExternalCallException])
  def getUserHorseRacingBets(from: LocalDateTime, to: LocalDateTime)(implicit currentTime: LocalDateTime): Future[Seq[InBetSelection]] = {
    val executionTime = currentTime.atZone(ZoneOffset.UTC)
    dataAPIClient.callOpenBets(from, to)
      .map(responseJSON => {
        responseJSON("Bets").as[List[JsValue]]
          .filter(isSingleBet)
          .flatMap(b => {
            val bet = b.as[Bet]
            b("Selections").as[List[JsValue]]
              .filter(isHorseRacingSelection)
              .filter(isWinnerSelection)
              .map(s => InBetSelection(bet, s.as[Selection])(executionTime))
          })
          .distinct
      })
  }

  private def isSingleBet(candidate: JsValue): Boolean = {
    val betType = candidate("BetTypeId").as[Int]
    (SBTechBetType.BET_TYPE_ID_SINGLE == betType
      || SBTechBetType.BET_TYPE_ID_QA == betType)
  }

  private def isHorseRacingSelection(candidate: JsValue): Boolean = {
    candidate("BranchID").as[Int] == SBTechSportType.HORSE_RACING.getSbtechId
  }

  private def isWinnerSelection(candidate: JsValue): Boolean = {
    val lineType = candidate("LineTypeID").as[Int]
    (SBTechLineType.LINE_TYPE_ID_WINNER == lineType
      || SBTechLineType.LINE_TYPE_ID_EACH_WAY == lineType
      || SBTechLineType.LINE_TYPE_ID_SP_WINNER == lineType
      || SBTechLineType.LINE_TYPE_ID_SP_EACH_WAY == lineType)
  }
}
