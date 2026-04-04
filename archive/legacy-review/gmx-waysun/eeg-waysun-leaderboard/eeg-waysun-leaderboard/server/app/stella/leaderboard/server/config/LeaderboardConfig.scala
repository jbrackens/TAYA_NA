package stella.leaderboard.server.config

import java.util.UUID

import scala.concurrent.duration.FiniteDuration

import com.typesafe.config.ConfigFactory
import pureconfig.generic.auto._

import stella.common.core.config.BaseConfig
import stella.common.http.config.OpenApiConfig
import stella.common.http.jwt.config.JwtConfig
import stella.common.models.Ids._
import stella.common.models.instances._

import stella.leaderboard.models.Ids._

final case class LeaderboardConfig(
    secretBoxHexKey: String,
    testUserId: UserId,
    testProjectId: ProjectId,
    cache: CacheConfig,
    jwt: JwtConfig,
    openApi: OpenApiConfig)

object LeaderboardConfig extends BaseConfig[LeaderboardConfig]("stella.leaderboard") {
  def loadConfig(): LeaderboardConfig = {
    val config = ConfigFactory.load()
    LeaderboardConfig(config)
  }
}

final case class CacheConfig(
    windowsTimeout: FiniteDuration,
    aggregationResultsTimeout: FiniteDuration,
    neighborsTimeout: FiniteDuration,
    compareResultsTimeout: FiniteDuration)
