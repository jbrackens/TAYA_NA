package tech.argyll.gmx.predictorgame.services.competition

import java.sql.Timestamp

import javax.inject.{Inject, Singleton}
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ExtensionMethodConversions
import tech.argyll.gmx.predictorgame.Tables.RoundsRow
import tech.argyll.gmx.predictorgame.domain.model.SportType.SportType
import tech.argyll.gmx.predictorgame.domain.repository.RoundRepository

import scala.concurrent.{ExecutionContext, Future}

trait ICompetitionService {

  def currentRound(competition: String)(implicit sportType: SportType, currentTime: Timestamp): Future[Option[RoundsRow]]

  def maxRounds(competition: String)(implicit sportType: SportType, currentTime: Timestamp): Future[Option[Int]]
}

@Singleton
class CompetitionService @Inject()(val dbConfigProvider: DatabaseConfigProvider,
                                   roundRepo: RoundRepository)
                                  (implicit ec: ExecutionContext)
  extends ICompetitionService
    with HasDatabaseConfigProvider[JdbcProfile] with ExtensionMethodConversions {

  implicit val dbc: DatabaseConfig[JdbcProfile] = dbConfig

  override def currentRound(competition: String)(implicit sportType: SportType, currentTime: Timestamp): Future[Option[RoundsRow]] = {
    dbc.db.run(roundRepo.findRound(competition, currentTime))
  }

  override def maxRounds(competition: String)(implicit sportType: SportType, currentTime: Timestamp): Future[Option[Int]] = {
    dbc.db.run(roundRepo.findMaxRound(competition))
  }
}
