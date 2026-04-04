package tech.argyll.gmx.predictorgame.admin.modules

import com.google.inject._
import play.api.db.slick.DatabaseConfigProvider
import slick.jdbc.JdbcProfile
import tech.argyll.gmx.predictorgame.domain.repository._

import scala.concurrent.ExecutionContext

class DbModule extends AbstractModule {

  override def configure() = {
  }

  @Provides
  @Singleton
  def provideEventRepository(dbConfigProvider: DatabaseConfigProvider)(implicit ec: ExecutionContext): EventRepository = {
    new EventRepository(dbConfigProvider.get[JdbcProfile])
  }

  @Provides
  @Singleton
  def provideLeaderboardRepository(dbConfigProvider: DatabaseConfigProvider)(implicit ec: ExecutionContext): LeaderboardRepository = {
    new LeaderboardRepository(dbConfigProvider.get[JdbcProfile])
  }

  @Provides
  @Singleton
  def providePredictionRepository(dbConfigProvider: DatabaseConfigProvider)(implicit ec: ExecutionContext): PredictionRepository = {
    new PredictionRepository(dbConfigProvider.get[JdbcProfile])
  }

  @Provides
  @Singleton
  def provideRoundRepository(dbConfigProvider: DatabaseConfigProvider)(implicit ec: ExecutionContext): RoundRepository = {
    new RoundRepository(dbConfigProvider.get[JdbcProfile])
  }

  @Provides
  @Singleton
  def provideUserRepository(dbConfigProvider: DatabaseConfigProvider)(implicit ec: ExecutionContext): UserRepository = {
    new UserRepository(dbConfigProvider.get[JdbcProfile])
  }

}
