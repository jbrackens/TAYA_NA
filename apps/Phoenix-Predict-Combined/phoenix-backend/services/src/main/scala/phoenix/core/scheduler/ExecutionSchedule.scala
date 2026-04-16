package phoenix.core.scheduler

import java.time.DayOfWeek

import scala.concurrent.duration.FiniteDuration

import phoenix.core.TimeUtils.TimeOfADay

sealed trait ExecutionSchedule

object ExecutionSchedule {
  final case class Recurring(every: FiniteDuration) extends ExecutionSchedule
  final case class Daily(startTime: TimeOfADay) extends ExecutionSchedule
  final case class Weekly(dayOfWeek: DayOfWeek, startTime: TimeOfADay) extends ExecutionSchedule
  final case class Monthly(dayOfMonth: Int, startTime: TimeOfADay) extends ExecutionSchedule
}
