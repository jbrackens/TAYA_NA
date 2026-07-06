package phoenix.core.deployment

import java.time.ZoneId

import pureconfig.generic.auto._

import phoenix.core.config.BaseConfig

final case class DeploymentConfig(timezone: ZoneId)

object DeploymentConfig {
  object of extends BaseConfig[DeploymentConfig]("phoenix.deployment")
}
