package phoenix.core.scheduler

import java.time.format.DateTimeFormatter

import scala.concurrent.duration.FiniteDuration

import pureconfig.ConfigReader
import pureconfig.ConfigSource
import pureconfig.configurable.localTimeConfigConvert
import pureconfig.generic.FieldCoproductHint
import pureconfig.generic.semiauto.deriveReader

import phoenix.core.TimeUtils.TimeOfADay
import phoenix.core.scheduler.ExecutionSchedule.Daily
import phoenix.core.scheduler.ExecutionSchedule.Monthly
import phoenix.core.scheduler.ExecutionSchedule.Recurring
import phoenix.core.scheduler.ExecutionSchedule.Weekly

object ConfigCodecs {

  private implicit val executionScheduleReader: ConfigReader[ExecutionSchedule] = {
    implicit val localTimeReader: ConfigReader[TimeOfADay] =
      localTimeConfigConvert(DateTimeFormatter.ofPattern("HH:mm")).map(TimeOfADay(_))
    implicit val typeDiscriminator: FieldCoproductHint[ExecutionSchedule] = new FieldCoproductHint("mode")

    implicit val recurringReader: ConfigReader[Recurring] = deriveReader
    implicit val dailyReader: ConfigReader[Daily] = deriveReader
    implicit val weeklyReader: ConfigReader[Weekly] = deriveReader
    implicit val monthlyReader: ConfigReader[Monthly] = deriveReader

    deriveReader
  }

  implicit val scheduledJobConfig: ConfigReader[ScheduledJobConfig] = ConfigReader.fromCursor { cursor =>
    for {
      jobConfig <- cursor.asObjectCursor
      jobName <- jobConfig.atKey("name").flatMap(_.asString)
      scheduleString <- jobConfig.atKey("schedule").flatMap(_.asString)
      schedule <- ConfigSource.string(scheduleString).load[ExecutionSchedule]
      timeRestriction <- jobConfig.atKey("time-restriction").flatMap(ConfigReader[FiniteDuration].from(_))
      maxRetries <- jobConfig.atKey("max-retries").flatMap(_.asInt)
    } yield ScheduledJobConfig(jobName, schedule, timeRestriction, maxRetries)
  }
}
