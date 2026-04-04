package stella.leaderboard.server.it

import com.typesafe.config.Config
import com.typesafe.config.ConfigFactory
import org.scalamock.scalatest.MockFactory
import org.scalatestplus.play.FakeApplicationFactory
import play.api.Application
import play.api.ApplicationLoader
import play.api.Environment
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import stella.common.core.Clock
import stella.common.core.JavaOffsetDateTimeClock
import stella.common.http.jwt.DisabledJwtAuthorization
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.StellaAuthContext

import stella.leaderboard.server.LeaderboardComponents
import stella.leaderboard.server.LeaderboardModule

trait IntegrationTestApplicationFactory extends FakeApplicationFactory with MockFactory {

  protected lazy val configForDbAccess: Config = ConfigFactory.load()
  protected lazy val jwtAuth: JwtAuthorization[StellaAuthContext] = new DisabledJwtAuthorization()
  protected lazy val testClock: Clock = JavaOffsetDateTimeClock
  protected var leaderboardModule: LeaderboardModule = _
  protected lazy val initialSettings: Map[String, AnyRef] = Map.empty

  override def fakeApplication(): Application = {
    val env = Environment.simple()
    val context = ApplicationLoader.Context.create(env, initialSettings)
    val components = new LeaderboardComponents(context) {
      override lazy val dbConfig: DatabaseConfig[JdbcProfile] =
        DatabaseConfig.forConfig("slick.dbs.default", configForDbAccess)
      override lazy val clock: Clock = testClock
      override implicit lazy val jwtAuthorization: JwtAuthorization[StellaAuthContext] = jwtAuth
    }
    leaderboardModule = components
    components.application
  }
}
