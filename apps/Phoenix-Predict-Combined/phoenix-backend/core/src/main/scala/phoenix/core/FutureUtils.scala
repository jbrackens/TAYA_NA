package phoenix.core

import java.util.concurrent.TimeoutException

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration.FiniteDuration

import akka.actor.Scheduler
import akka.pattern.after

trait FutureUtils {
  def withTimeout[T](timeout: FiniteDuration)(
      f: => Future[T])(implicit executionContext: ExecutionContext, scheduler: Scheduler): Future[T] = {
    val timer = after(duration = timeout, using = scheduler)(
      Future.failed(new TimeoutException(s"Future timed out after ${timeout}")))

    Future.firstCompletedOf(Seq(timer, f))
  }
}

object FutureUtils extends FutureUtils
