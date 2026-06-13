package phoenix.punters.support

import scala.concurrent.Future

import phoenix.core.TimeUtils
import phoenix.reports.ReportsModule

class EmptyReportsModule extends ReportsModule {
  def executeDGEReports(date: TimeUtils.Date): Future[Unit] = Future.successful(())
}
