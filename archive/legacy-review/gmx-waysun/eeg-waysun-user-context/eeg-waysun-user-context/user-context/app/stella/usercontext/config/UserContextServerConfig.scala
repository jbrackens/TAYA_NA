package stella.usercontext.config

import java.util.UUID

import scala.concurrent.duration.FiniteDuration

import com.typesafe.config.ConfigFactory
import pureconfig.generic.auto._

import stella.common.core.config.BaseConfig
import stella.common.http.config.OpenApiConfig
import stella.common.http.jwt.config.JwtConfig
import stella.common.models.Ids.UserId
import stella.common.models.instances._

final case class UserContextServerConfig(
    startAkkaManagementAndClusterBootstrap: Boolean, // for k8s
    secretBoxHexKey: String,
    testUserId: UserId,
    testProjectId: UUID,
    jwt: JwtConfig,
    openApi: OpenApiConfig,
    userContextEntityAskTimeout: FiniteDuration)

object UserContextServerConfig extends BaseConfig[UserContextServerConfig]("stella.user-context.server") {
  def loadConfig(): UserContextServerConfig = {
    val config = ConfigFactory.load()
    UserContextServerConfig(config)
  }
}
