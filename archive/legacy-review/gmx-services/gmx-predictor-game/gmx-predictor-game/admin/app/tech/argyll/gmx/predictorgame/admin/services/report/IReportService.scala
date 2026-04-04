package tech.argyll.gmx.predictorgame.admin.services.report

import java.sql.Timestamp

import javax.inject.{Inject, Singleton}
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ExtensionMethodConversions
import tech.argyll.gmx.predictorgame.domain.model.EventStatus
import tech.argyll.gmx.predictorgame.domain.model.SportType.SportType
import tech.argyll.gmx.predictorgame.domain.repository.{EventRepository, PredictionRepository, RoundRepository}

import scala.concurrent.{ExecutionContext, Future}


trait IReportService {
  def getSelections(competition: String, roundNo: Int, partnerId: String)(implicit sportType: SportType, currentTime: Timestamp): Future[Seq[SelectionsReportRow]]
}


@Singleton
class ReportService @Inject()(val dbConfigProvider: DatabaseConfigProvider,
                              roundRepo: RoundRepository, eventRepo: EventRepository, predictionRepo: PredictionRepository)
                             (implicit ec: ExecutionContext)
  extends IReportService
    with HasDatabaseConfigProvider[JdbcProfile] with ExtensionMethodConversions {

  import profile.api._

  implicit val dbc: DatabaseConfig[JdbcProfile] = dbConfig

  override def getSelections(competition: String, roundNo: Int, partnerId: String)(implicit sportType: SportType, currentTime: Timestamp): Future[Seq[SelectionsReportRow]] = {

    val report = for {
      round <- roundRepo.getRound(competition, roundNo)
      roundStats <- countEvents(round.id)
      predictions <- predictionRepo.listUserWithPredictions(round.id, partnerId)
    } yield (roundStats, predictions)

    dbc.db.run(report.transactionally)
      .map {
        case ((eventsTotal, eventsValid), rows) => rows.map {
          case (_, account, predictions) => SelectionsReportRow(account.map(_.externalId).getOrElse("---"), eventsTotal, eventsValid, predictions.totalSelections, predictions.correctSelections)
        }
      }
  }

  private def countEvents(id: String) = {
    eventRepo.listEvents(id).map(events => (events.size, events.count(_.status != EventStatus.VOID.toString)))
  }
}