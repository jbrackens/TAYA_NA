package tech.argyll.gmx.predictorgame.domain.repository

import java.sql.Timestamp

import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import tech.argyll.gmx.predictorgame.Tables.{Rounds, RoundsRow}
import tech.argyll.gmx.predictorgame.domain.NotFoundException

import scala.concurrent.ExecutionContext

class RoundRepository(val config: DatabaseConfig[JdbcProfile])(implicit ec: ExecutionContext) {

  import config.profile.api._

  def getRound(id: String): DBIO[RoundsRow] = {
    findRound(id)
      .map(_.getOrElse(throw NotFoundException(s"Cannot find round for id '$id'")))
  }

  def findRound(id: String): DBIO[Option[RoundsRow]] = {
    Queries.roundById(id).result.headOption
  }

  def getRound(competition: String, timestamp: Timestamp): DBIO[RoundsRow] = {
    findRound(competition, timestamp)
      .map(_.getOrElse(throw NotFoundException(s"Cannot find round for timestamp '$timestamp' in competition '$competition'")))
  }

  def findRound(competition: String, timestamp: Timestamp): DBIO[Option[RoundsRow]] = {
    Queries.roundByTimeInCompetition(competition, timestamp).result.headOption
  }

  def getRound(competition: String, number: Int): DBIO[RoundsRow] = {
    findRound(competition, number)
      .map(_.getOrElse(throw NotFoundException(s"Cannot find round for number '$number' in competition '$competition'")))
  }

  def findRound(competition: String, number: Int): DBIO[Option[RoundsRow]] = {
    Queries.roundByNumberInCompetition(competition, number).result.headOption
  }

  def findMaxRound(competition: String): DBIO[Option[Int]] = {
    Queries.maxRoundNumberInCompetition(competition).result
  }


  object Queries {
    def roundById(roundId: String) = {
      Rounds
        .filter(_.id === roundId)
    }

    def roundByTimeInCompetition(competition: String, timestamp: Timestamp) = {
      Rounds
        .filter(_.competitionId === competition)
        .filter(_.startTime <= timestamp)
        .filter(_.endTime > timestamp)
    }

    def roundByNumberInCompetition(competition: String, number: Int) = {
      Rounds
        .filter(_.competitionId === competition)
        .filter(_.number === number)
    }

    def maxRoundNumberInCompetition(competition: String) = {
      Rounds
        .filter(_.competitionId === competition)
        .map(_.number).max
    }
  }

}
