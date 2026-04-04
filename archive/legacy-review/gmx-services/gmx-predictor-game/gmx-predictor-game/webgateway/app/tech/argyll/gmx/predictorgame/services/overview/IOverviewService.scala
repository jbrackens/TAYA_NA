package tech.argyll.gmx.predictorgame.services.overview

import java.sql.Timestamp

import javax.inject.{Inject, Singleton}
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ExtensionMethodConversions
import tech.argyll.gmx.predictorgame.domain.model.SportType.SportType
import tech.argyll.gmx.predictorgame.domain.repository.{EventRepository, PredictionRepository, RoundRepository, UserRepository}
import tech.argyll.gmx.predictorgame.engine.BusinessConditions
import tech.argyll.gmx.predictorgame.services.prediction._

import scala.concurrent.{ExecutionContext, Future}

trait IOverviewService {
  def getUserPicks(competition: String, roundNo: Int, userId: String)(implicit sportType: SportType, currentTime: Timestamp): Future[Seq[OverviewEntry]]
}


@Singleton
class OverviewService @Inject()(val dbConfigProvider: DatabaseConfigProvider,
                                userRepo: UserRepository, roundRepo: RoundRepository, eventRepo: EventRepository,
                                predictionLoader: PredictionLoader, predictionRepo: PredictionRepository)
                               (implicit ec: ExecutionContext)
  extends IOverviewService with BusinessConditions
    with HasDatabaseConfigProvider[JdbcProfile] with ExtensionMethodConversions {

  implicit val dbc: DatabaseConfig[JdbcProfile] = dbConfig


  override def getUserPicks(competition: String, roundNo: Int, userSub: String)(implicit sportType: SportType, currentTime: Timestamp): Future[Seq[OverviewEntry]] = {

    val input = prepareRoundAndUser(competition, roundNo, userSub)

    input.flatMap { case (r, u) =>
      for {
        events <- dbc.db.run(eventRepo.listEvents(r.id))
        existing <- dbc.db.run(predictionRepo.findUserPredictions(r.id, u.id))
        result <- existing
          .map(up => predictionLoader.loadStoredPredictions(true, up, events))
          .getOrElse(predictionLoader.loadFromEvents(true, events))
      } yield result
        .sortBy(e => (e.startTime.toEpochSecond, e.selections(0).id))
        .map(e => OverviewEntry(e.id, s"${e.selections(1).id} AT ${e.selections(0).id}", e.points, e.selection, e.matchStatus, e.evaluation))
    }
  }

  private def prepareRoundAndUser(competition: String, roundNo: Int, userSub: String) = {
    for {
      r <- dbc.db.run(roundRepo.getRound(competition, roundNo))
      u <- dbc.db.run(userRepo.getUser(userSub))
    } yield (r, u)
  }
}

