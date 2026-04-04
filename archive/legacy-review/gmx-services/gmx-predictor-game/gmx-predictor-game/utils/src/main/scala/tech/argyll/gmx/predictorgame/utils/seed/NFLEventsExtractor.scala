package tech.argyll.gmx.predictorgame.utils.seed

import java.sql.Timestamp
import java.time
import java.time.format.DateTimeFormatter
import java.time.{LocalDateTime, ZoneId}

import com.softwaremill.sttp._
import com.typesafe.scalalogging.LazyLogging
import tech.argyll.gmx.predictorgame.Tables.{Events, EventsRow}
import tech.argyll.gmx.predictorgame.domain.DbConfiguration
import tech.argyll.gmx.predictorgame.domain.model.LegacyConstants.COMPETITION_NFL2018
import tech.argyll.gmx.predictorgame.domain.model.team.{TeamCompetitionEvent, TeamCompetitionSelectionDetails}
import tech.argyll.gmx.predictorgame.domain.repository.{EventRepository, RoundRepository}

import scala.annotation.tailrec
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration.Duration
import scala.concurrent.{Await, Future}

object NFLEventsExtractor extends App with LazyLogging with DbConfiguration {
  implicit val db = config.db

  import config.profile.api._

  val roundRepo = new RoundRepository(config)
  val eventRepo = new EventRepository(config)

  val timeFormat = DateTimeFormatter.ofPattern("yyyyMMddhh':'mma")

  def computeTimestamp(d: String, t: String) = {
    val dt = d + (if (t.length < 5) "0" + t else t) + "PM"

    val time = LocalDateTime.parse(dt, timeFormat).atZone(ZoneId.of("America/New_York"))
    Timestamp.from(time.toInstant)
  }

  def translateStatus(status: String) = {
    if ("F".equals(status) || "FO".equals(status)) {
      "FINISHED"
    } else {
      "NEW"
    }
  }

  def wrapScore(score: String): Option[Int] = {
    if (score == null || score.length == 0) {
      None
    } else {
      Some(score.toInt)
    }
  }

  def compareScore(homeScore: Option[Int], awayScore: Option[Int]): Option[Int] = {
    homeScore.flatMap(hs => awayScore.map(as => hs.compareTo(as)))
  }

  def pickWinner(home: String, away: String, scoreCompared: Option[Int]): Option[String] = {
    scoreCompared.flatMap(sc =>
      if (sc > 0) {
        Some(home)
      } else if (sc < 0) {
        Some(away)
      } else {
        None
      }
    )
  }

  abstract class DataSourceApi()

  class NFLDotComAPI extends DataSourceApi {
    implicit val backend = HttpURLConnectionBackend()

    val url = "http://www.nfl.com/ajax"

    def getScheduleForWeek(week: Int, season: Int = 2018, seasonType: String = "REG") = {
      sttp.get(uri"$url/scorestrip?season=$season&seasonType=$seasonType&week=$week")
        .contentType(MediaTypes.Json)
        .send()
        .unsafeBody
    }
  }


  def extractSeasonSchedule(season: Int = 2018) = {
    val api = new NFLDotComAPI

    @tailrec
    def inner(week: Int, acc: List[TeamCompetitionEvent]): List[TeamCompetitionEvent] = {
      if (week > 17) acc
      else {
        println(s"Processing week $week/$season")
        val round = Await.result(db.run(roundRepo.getRound(COMPETITION_NFL2018.toString, week)), Duration.Inf)
        val body = scala.xml.XML.loadString(api.getScheduleForWeek(week))

        val comp = for {
          game <- body \\ "g"
          event_id <- game \ "@gsis"
          home_sym <- game \ "@h"
          home_name <- game \ "@hnn"
          home_score <- game \ "@hs"
          away_sym <- game \ "@v"
          away_name <- game \ "@vnn"
          away_score <- game \ "@vs"
          date <- game \ "@eid"
          time <- game \ "@t"
          q <- game \ "@q"
        } yield {
          val timestamp = computeTimestamp(date.toString().substring(0, 8), time.toString())
          val status = translateStatus(q.toString())
          val homeScore = wrapScore(home_score.toString())
          val awayScore = wrapScore(away_score.toString())
          val scoreCompared = compareScore(homeScore, awayScore)
          val winner = pickWinner(home_sym.toString(), away_sym.toString(), scoreCompared)

          TeamCompetitionEvent(
            EventsRow(
              event_id.toString(),
              timestamp,
              status,
              winner,
              round.id,
              home_sym.toString().toUpperCase(),
              None,
              away_sym.toString().toUpperCase(),
              None),
            TeamCompetitionSelectionDetails(
              home_name.toString().capitalize,
              homeScore
            ),
            TeamCompetitionSelectionDetails(
              away_name.toString().capitalize,
              awayScore
            )
          )

        }

        inner(week + 1, acc ++ comp)
      }
    }

    inner(1, Nil)
  }

  val events: List[TeamCompetitionEvent] = extractSeasonSchedule()
    .sortBy(_.event.id)

  events.foreach(printResult)

  Await.result(events
    .foldLeft(Future.successful[Any](()))
    ((future, event) => future.flatMap(_ => {
      db.run(eventRepo.getEvent(event.event.id))
    }).flatMap(dbEvent => {
      updateChanges(event.event, dbEvent)
    })),
    Duration.Inf)


  private def printResult(apiVersion: TeamCompetitionEvent) = {
    if ("NEW".equals(apiVersion.event.status)) {
      print("""// """)
    }
    println(s"""EventUpdate("${apiVersion.event.id}", ${apiVersion.event.status}, ${apiVersion.homeDetails.score}, ${apiVersion.awayDetails.score}, ${apiVersion.event.winner}),""")
  }

  private def updateChanges(apiVersion: EventsRow, dbVersion: EventsRow): Future[Any] = {
    if (apiVersion.startTime.equals(dbVersion.startTime)) {
      return Future(())
    }
    println(s"Date changed in event: ${apiVersion.id}, ${dbVersion.startTime} >> ${apiVersion.startTime}")
    val minutesDiff = time.Duration.between(dbVersion.startTime.toLocalDateTime, apiVersion.startTime.toLocalDateTime).toMinutes

    if (minutesDiff == 12 * 60) {
      println(s"Skip AM/PM hand adjustments - diff '$minutesDiff'min")
      return Future(())
    }

    println(s"Adjusting time - diff '$minutesDiff'min")
    updateStartTime(apiVersion)
  }

  private def updateStartTime(apiVersion: EventsRow) = {
    db.run(Events.filter(_.id === apiVersion.id).map(_.startTime).update(apiVersion.startTime))
  }
}
