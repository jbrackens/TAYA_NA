package phoenix.shared.support

import java.time.Month
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZoneOffset

import com.typesafe.config.ConfigFactory

import phoenix.core.deployment.DeploymentConfig

object TimeSupport {
  val deploymentConfig: DeploymentConfig = DeploymentConfig.of(ConfigFactory.load("deployment.conf"))
  val deploymentTimezone: ZoneId = deploymentConfig.timezone

  def deploymentTime(year: Int, month: Month, dayOfMonth: Int, hour: Int, minute: Int): OffsetDateTime = {
    val utcTime = OffsetDateTime.of(year, month.getValue, dayOfMonth, hour, minute, 0, 0, ZoneOffset.UTC)
    utcTime.withOffsetSameLocal(deploymentTimezone.getRules.getOffset(utcTime.toInstant))
  }
}
