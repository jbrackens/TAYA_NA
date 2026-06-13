package phoenix.core.scheduler

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration.FiniteDuration

trait ScheduledJob[T] {
  def execute()(implicit ec: ExecutionContext): Future[T]
}

final case class ScheduledJobConfig(
    name: String,
    schedule: ExecutionSchedule,
    timeRestriction: FiniteDuration,
    maxRetries: Int)
