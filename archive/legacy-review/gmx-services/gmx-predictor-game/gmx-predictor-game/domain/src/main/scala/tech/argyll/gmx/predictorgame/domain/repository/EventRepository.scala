package tech.argyll.gmx.predictorgame.domain.repository

import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import tech.argyll.gmx.predictorgame.Tables.{Events, EventsRow}
import tech.argyll.gmx.predictorgame.domain.NotFoundException

import scala.concurrent.ExecutionContext

class EventRepository(val config: DatabaseConfig[JdbcProfile])(implicit ec: ExecutionContext) {

  import config.profile.api.{actionBasedSQLInterpolation, _}

  def getEvent(eventId: String): DBIO[EventsRow] = {
    findEvent(eventId)
      .map(_.getOrElse(throw NotFoundException(s"Cannot find event for id '$eventId'")))
  }

  def getEvent(raceId: Long): DBIO[EventsRow] = {
    findEvent(raceId)
      .map(_.getOrElse(throw NotFoundException(s"Cannot find event with raceId '$raceId'")))
  }

  def findEvent(eventId: String): DBIO[Option[EventsRow]] = {
    Queries.eventById(eventId).result.headOption
  }

  def findEvent(raceId: Long): DBIO[Option[EventsRow]] = {
    Queries.eventByRaceId(raceId).as[EventsRow].headOption
  }

  def listEvents(roundId: String): DBIO[Seq[EventsRow]] = {
    Queries.eventsByRound(roundId).result
  }

  def updateEvent(event: EventsRow): DBIO[Int] = {
    Queries.updateEvent(event).asUpdate
  }

  object Queries {
    def eventById(eventId: String) = {
      Events.filter(_.id === eventId)
    }

    def eventByRaceId(raceId: Long) = {
      sql"""SELECT * FROM predictor.events
           | WHERE event_details ->> 'raceId' = ${raceId.toString}"""
        .stripMargin
    }

    // TODO: try using play-json with slick: https://github.com/tminglei/slick-pg
    def updateEvent(event: EventsRow) = {
      val detailsA: String = event.selectionADetails.map(quote(_)).orNull
      val detailsB: String = event.selectionBDetails.map(quote(_)).orNull
      sql"""UPDATE predictor.events u
           | SET status = ${event.status},
           | selection_a_details = #$detailsA,
           | selection_b_details = #$detailsB,
           | winner = ${event.winner}
           | WHERE u.id = ${event.id}"""
        .stripMargin
    }

    def eventsByRound(roundId: String) = {
      Events.filter(_.roundId === roundId)
    }
  }
}
