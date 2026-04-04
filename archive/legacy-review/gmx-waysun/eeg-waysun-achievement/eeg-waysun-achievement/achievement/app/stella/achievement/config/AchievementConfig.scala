package stella.achievement.config

import java.util.UUID

import scala.concurrent.duration.FiniteDuration

import com.typesafe.config.ConfigFactory
import pureconfig.generic.auto._

import stella.common.core.config.BaseConfig
import stella.common.http.config.OpenApiConfig
import stella.common.http.jwt.config.JwtConfig
import stella.common.models.Ids.UserId
import stella.common.models.instances._

final case class AchievementConfig(
    secretBoxHexKey: String,
    testUserId: UserId,
    testProjectId: UUID,
    cache: CacheConfig,
    jwt: JwtConfig,
    openApi: OpenApiConfig)

object AchievementConfig extends BaseConfig[AchievementConfig]("stella.achievement") {
  def loadConfig(): AchievementConfig = {
    val config = ConfigFactory.load()
    AchievementConfig(config)
  }
}

final case class CacheConfig(windowsTimeout: FiniteDuration, achievementEventsTimeout: FiniteDuration)
