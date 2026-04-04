package tech.argyll.gmx.predictorgame.admin.controllers

import java.io.ByteArrayInputStream
import java.sql.Timestamp

import akka.stream.scaladsl.{Source, StreamConverters}
import akka.util.ByteString
import com.typesafe.config.ConfigFactory
import javax.inject.{Inject, Singleton}
import play.api.mvc.InjectedController
import tech.argyll.gmx.predictorgame.admin.services.report.{IReportService, SelectionsReportRow}
import tech.argyll.gmx.predictorgame.common.TimeService
import tech.argyll.gmx.predictorgame.common.play.api.ResponseOps
import tech.argyll.gmx.predictorgame.domain.model.SportType

import scala.concurrent.ExecutionContext

@Singleton
class ReportController @Inject()(time: TimeService, service: IReportService)
                                (implicit ec: ExecutionContext)
  extends InjectedController
    with ResponseOps {

  val conf = ConfigFactory.load()
  val partnerId = conf.getString("app.dict.company.sportnation")

  def downloadSelections(sport: String, competition: String, round: Int) = {
    implicit val currentTime = Timestamp.valueOf(time.getCurrentTime)
    implicit val sportType = SportType.withName(sport)

    Action.async {
      service.getSelections(competition, round, partnerId).map(result => {
        val csvRows = formatCSV(result)
        val dataContent: Source[ByteString, _] = StreamConverters.fromInputStream(() =>
          new ByteArrayInputStream(csvRows.mkString(System.lineSeparator()).getBytes))
        Ok.chunked(dataContent)
          .withHeaders(
            "Content-Type" -> "text/csv",
            "Content-Disposition" -> s"attachment; filename=selectionsReport_${competition}_$round.csv"
          )
      })
    }
  }

  private def formatCSV(result: Seq[SelectionsReportRow]) = {
    List("user_id,ev_total,ev_not_void,picks_submitted,picks_correct") ++ result
      .sortBy(row => (-row.picksSubmitted, -row.picksCorrect, row.userId))
      .map(row => s"${row.userId},${row.eventsTotal},${row.eventsValid},${row.picksSubmitted},${row.picksCorrect}")
  }
}
