package phoenix.core

import java.util.concurrent.TimeoutException

import akka.actor.Scheduler
import akka.pattern.after

import scala.concurrent.duration.FiniteDuration
import scala.concurrent.{ ExecutionContext, Future }

trait FutureUtils {
  def withTimeout[T](timeout: FiniteDuration)(
      f: => Future[T])(implicit executionContext: ExecutionContext, scheduler: Scheduler): Future[T] = {
    val timer = after(duration = timeout, using = scheduler)(
      Future.failed(new TimeoutException(s"Future timed out after ${timeout}")))

    Future.firstCompletedOf(Seq(timer, f))
  }
}

object FutureUtils extends FutureUtils
