package phoenix.core.scheduler

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Failure
import scala.util.Success

import akka.actor.Scheduler
import akka.pattern.after
import akka.pattern.retry
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.core.ScalaObjectUtils._

/**
 * Simple implementation of retries and timeouts for job execution. This is just simplest version to provide basics:
 * - retry in case of basic failures (more complex problems will not get solved by simple repeat)
 * - making sure jobs do not stuck/starve - at least with log message, without specialized management
 *
 * @param scheduler - Akka scheduler used only to provide timout functionality without blocking `Await`.
 * @param executionContext - intentionally separate parameter (not whole ActorSystem), so we are able to pass new, separate pool
 */
private[scheduler] final class JobRunnerImpl(scheduler: Scheduler)(implicit executionContext: ExecutionContext)
    extends JobRunner {
  private val log: Logger = LoggerFactory.getLogger(getClass)

  def runJob(jobToSchedule: ScheduledJob[_], config: ScheduledJobConfig): Unit = {
    val attempts = config.maxRetries + 1
    val jobExecution = retry(() => executeEnsuringTime(jobToSchedule, config), attempts)

    jobExecution.onComplete {
      case Failure(cause) =>
        log.error(s"Failed to run ${jobToSchedule.simpleObjectName} after $attempts attempts", cause)
      case Success(_) => log.debug(s"Completed ${jobToSchedule.simpleObjectName}")
    }
  }

  private def executeEnsuringTime(jobToSchedule: ScheduledJob[_], config: ScheduledJobConfig): Future[_] = {
    log.debug(s"Attempt to run ${jobToSchedule.simpleObjectName}")
    val timedOut = after(config.timeRestriction, scheduler)(
      Future.failed(
        new IllegalStateException(s"Job ${jobToSchedule.simpleObjectName} timed out after ${config.timeRestriction}")))

    val jobExecutionWithLimit = Future.firstCompletedOf(Seq(timedOut, jobToSchedule.execute()))
    jobExecutionWithLimit.failed.foreach(cause =>
      log.debug(s"Attempt to run ${jobToSchedule.simpleObjectName} failed", cause))
    jobExecutionWithLimit
  }
}

trait JobRunner {
  def runJob(jobToSchedule: ScheduledJob[_], config: ScheduledJobConfig): Unit
}
