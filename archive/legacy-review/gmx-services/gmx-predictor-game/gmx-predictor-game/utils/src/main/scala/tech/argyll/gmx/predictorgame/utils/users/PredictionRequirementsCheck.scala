package tech.argyll.gmx.predictorgame.utils.users

import java.io.File

import com.typesafe.scalalogging.LazyLogging
import tech.argyll.gmx.predictorgame.Tables.{Rounds, UserPredictions, UserPredictionsRow, Users, UsersRow}
import tech.argyll.gmx.predictorgame.common.CollectionsOps
import tech.argyll.gmx.predictorgame.domain.DbConfiguration
import tech.argyll.gmx.predictorgame.domain.model.UserType
import tech.argyll.gmx.predictorgame.domain.repository.RoundRepository

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration.Duration
import scala.concurrent.{Await, Future}
import scala.io.Source

object PredictionRequirementsCheck extends App with LazyLogging with DbConfiguration with CollectionsOps {

  import config.profile.api._

  implicit val db = config.db

  val roundsRepo = new RoundRepository(config)


  private val reports: Seq[(Int, String)] = listReports("")

  reports
    .sortBy(_._1)
    .collect { case (round, reportPath) =>
      logger.info(s"PROCESSING ROUND '$round'")
      val betsReport = loadReportFile(reportPath)
      val dbPredictions = loadUsers(round)

      updateDb(betsReport, dbPredictions)
    }


  def listReports(dir: String): Seq[(Int, String)] = {
    val roundReportPattern = "([0-9]+)\\.csv".r
    val d = new File(dir)
    if (d.exists && d.isDirectory) {
      d.listFiles
        .filter(_.isFile)
        .toList
        .map(f => (f.getName, f.getAbsolutePath))
        .collect { case (roundReportPattern(round), path) =>
          (round.toInt, path)
        }
    } else {
      List[(Int, String)]()
    }
  }

  case class ReportItem(accountId: String, banned: Boolean)

  def loadReportFile(input: String) = {
    val betsReportKey = (a: ReportItem) => a.accountId
    Source.fromFile(input, "UTF-8")
      .getLines()
      .drop(1)
      .map(line => {
        val split = line.split(",")
        ReportItem(split(0), split(1).equalsIgnoreCase("TRUE"))
      })
      .toList.sortBy(betsReportKey)
      .map(a => (betsReportKey(a), a))
  }

  def loadUsers(round: Int) = {
    val dbPredictionsKey = (u: (UsersRow, UserPredictionsRow)) => u._1.externalId.getOrElse("NULL")
    val query = for {
      round <- Rounds.filter(_.number === round)
      predictions <- UserPredictions if predictions.roundId === round.id
      user <- Users if predictions.userId === user.id
    } yield (user, predictions)

    db.run(query.result.transactionally)
      .map(_.toList
        .sortBy(dbPredictionsKey)
        .map(a => (dbPredictionsKey(a), a))
      )
  }

  def updateDb(betsReport: List[(String, ReportItem)], dbPredictions: Future[List[(String, (UsersRow, UserPredictionsRow))]]) = {
    val userChanges = dbPredictions
      .flatMap(sortedPredictions => {
        val updates = outerJoin(sortedPredictions, betsReport)
          .map {
            case (None, Some(bet)) => DBIO.successful(logger.debug(s"User '${bet.accountId}' not participating in the game"))
            case (Some((user, prediction)), betOpt) => updatePrediction(user, prediction, betOpt)
            case (_, _) => DBIO.successful(())
          }

        db.run(DBIO.sequence(updates))
      })
    Await.result(userChanges, Duration.Inf)
  }

  def updatePrediction(user: UsersRow, prediction: UserPredictionsRow, betOpt: Option[ReportItem]): DBIO[Int] = {
    val eligible = isEligible(user, betOpt)
    if (prediction.prizeEligible != eligible) {
      logger.info(s"User '${user.externalId.get}' updating eligible flag '$eligible'")
      UserPredictions.filter(_.id === prediction.id).map(_.prizeEligible).update(eligible)
    } else {
      logger.debug(s"User '${user.externalId.get}' eligible flag not changed '$eligible'")
      DBIO.successful(0)
    }
  }

  def isEligible(user: UsersRow, betOpt: Option[ReportItem]): Boolean = {
    betOpt.exists(row => !row.banned && UserType.REAL.toString == user.`type`)
  }

}
