package tech.argyll.gmx.predictorgame.domain.repository

import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import tech.argyll.gmx.predictorgame.Tables.{EventPredictions, EventPredictionsRow, UserAccountMapping, UserAccountMappingRow, UserPredictions, UserPredictionsRow, Users, UsersRow}
import tech.argyll.gmx.predictorgame.domain.NotFoundException

import scala.concurrent.ExecutionContext

class PredictionRepository(val config: DatabaseConfig[JdbcProfile])(implicit ec: ExecutionContext) {

  import config.profile.api._

  def getUserPredictions(roundId: String, userId: String): DBIO[UserPredictionsRow] = {
    findUserPredictions(roundId, userId)
      .map(_.getOrElse(throw NotFoundException(s"Cannot find prediction for round '$roundId' and user '$userId'")))
  }

  def findUserPredictions(roundId: String, userId: String): DBIO[Option[UserPredictionsRow]] = {
    Queries.userPredictionByRoundAndUser(roundId, userId).result.headOption
  }

  def listUserWithPredictions(roundId: String, partnerId: String): DBIO[Seq[(UsersRow, Option[UserAccountMappingRow], UserPredictionsRow)]] = {
    Queries.userPredictionByRoundWithUserAccount(roundId, partnerId).result
  }

  def insertOrUpdate(row: UserPredictionsRow): DBIO[UserPredictionsRow] = {
    val result = for {
      _ <- UserPredictions.insertOrUpdate(row)
      result <- getUserPredictions(row.roundId, row.userId)
    } yield result
    result.transactionally
  }

  def deleteUserPredictions(roundId: String, userId: String): DBIO[Int] = {
    val result = for {
      up <- getUserPredictions(roundId, userId)
      _ <- Queries.eventPredictionByPredictionId(up.id).delete
      result <- Queries.userPredictionByRoundAndUser(roundId, userId).delete
    } yield result
    result.transactionally
  }

  def listEventPredictions(prediction: UserPredictionsRow): DBIO[Seq[EventPredictionsRow]] = {
    Queries.eventPredictionByPredictionId(prediction.id).result
  }

  def insertOrUpdate(predictions: Seq[EventPredictionsRow]): DBIO[Any] = {
    val toBeInserted = predictions.map { prediction => EventPredictions.insertOrUpdate(prediction) }
    DBIO.sequence(toBeInserted).transactionally
  }

  object Queries {
    def userPredictionByRoundWithUserAccount(roundId: String, partnerId: String) = {
      for {
        entry <- UserPredictions.filter(_.roundId === roundId)
        (user, account) <- Users
          .joinLeft(UserAccountMapping.filter(_.partnerId === partnerId)).on(_.oidcSub === _.oidcSub)
        if user.id === entry.userId
      } yield (user, account, entry)
    }

    def userPredictionByRoundAndUser(roundId: String, userId: String) = {
      UserPredictions
        .filter(_.roundId === roundId)
        .filter(_.userId === userId)
    }

    def eventPredictionByPredictionId(predictionId: String) = {
      EventPredictions
        .filter(_.predictionId === predictionId)
    }
  }

}
