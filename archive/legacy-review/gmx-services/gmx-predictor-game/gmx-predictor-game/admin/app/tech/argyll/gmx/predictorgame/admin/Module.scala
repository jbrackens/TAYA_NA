package tech.argyll.gmx.predictorgame.admin

import java.time.Clock

import com.google.inject.{AbstractModule, Provides, Singleton}
import tech.argyll.gmx.predictorgame.admin.services.report.{IReportService, ReportService}
import tech.argyll.gmx.predictorgame.common.TimeService

class Module extends AbstractModule {

  override def configure() = {
    bind(classOf[IReportService]).to(classOf[ReportService])

    bind(classOf[Clock]).toInstance(Clock.systemUTC())
  }

  @Provides
  @Singleton
  def provideTimeService(clock: Clock): TimeService = {
    new TimeService(clock)
  }
}
