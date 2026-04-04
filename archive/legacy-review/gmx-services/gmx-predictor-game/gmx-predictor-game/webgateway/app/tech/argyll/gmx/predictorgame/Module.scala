package tech.argyll.gmx.predictorgame

import java.time.Clock

import com.google.inject.{AbstractModule, Provides, Singleton}
import com.softwaremill.sttp.{HttpURLConnectionBackend, Id, SttpBackend}
import tech.argyll.gmx.predictorgame.common.TimeService
import tech.argyll.gmx.predictorgame.services.competition.{CompetitionService, ICompetitionService}
import tech.argyll.gmx.predictorgame.services.leaderboard.{ILeaderboardService, LeaderboardService}
import tech.argyll.gmx.predictorgame.services.overview.{IOverviewService, OverviewService}
import tech.argyll.gmx.predictorgame.services.prediction.{IPredictionService, PredictionService}
import tech.argyll.gmx.predictorgame.services.user.{IUserService, UserService}

class Module extends AbstractModule {

  override def configure() = {
    bind(classOf[IUserService]).to(classOf[UserService])
    bind(classOf[ICompetitionService]).to(classOf[CompetitionService])
    bind(classOf[IPredictionService]).to(classOf[PredictionService])
    bind(classOf[ILeaderboardService]).to(classOf[LeaderboardService])
    bind(classOf[IOverviewService]).to(classOf[OverviewService])

    bind(classOf[Clock]).toInstance(Clock.systemUTC())
  }

  @Provides
  @Singleton
  def provideHttpBackend(): SttpBackend[Id, Nothing] = {
    HttpURLConnectionBackend()
  }

  @Provides
  @Singleton
  def provideTimeService(clock: Clock): TimeService = {
    new TimeService(clock)
  }
}
