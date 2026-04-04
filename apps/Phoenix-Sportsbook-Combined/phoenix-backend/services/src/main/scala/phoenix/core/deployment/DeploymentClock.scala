package phoenix.core.deployment

import phoenix.core.Clock

object DeploymentClock {
  def fromConfig(config: DeploymentConfig): Clock =
    Clock.forZone(config.timezone)
}
