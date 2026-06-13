package net.flipsports.gmx.streaming

import com.typesafe.scalalogging.LazyLogging
import org.apache.flink.runtime.testutils.MiniClusterResourceConfiguration
import org.apache.flink.test.util.MiniClusterWithClientResource
import org.scalatest.concurrent.Eventually
import org.scalatest.{Matchers, OptionValues, WordSpec}

import scala.concurrent.Future
import scala.util.Try

trait BaseTestSpec extends WordSpec with OptionValues with Matchers with LazyLogging with Eventually {

  def retry[T](n: Int)(fn: => T): T = {
    util.Try { fn } match {
      case util.Success(x) => x
      case _ if n > 1 => retry(n - 1)(fn)
      case util.Failure(e) => throw e
    }
  }
}

trait InternalFlinkMiniCluster {

  implicit def executionContext = scala.concurrent.ExecutionContext.Implicits.global

  def withFlink[T](test: MiniClusterWithClientResource => T) {
    val configuration = new MiniClusterResourceConfiguration.Builder()
      .setNumberTaskManagers(1)
      .setNumberSlotsPerTaskManager(2)
      .build

    val miniClusterResource = new MiniClusterWithClientResource(configuration)
    try {
      miniClusterResource.before()
      test(miniClusterResource)
    } finally {
      miniClusterResource.after()
    }
  }

  def runAsyncJob[T, R](input:  => R): Thread = {
    var thread: Option[Thread] = None

    try {
      thread = Some(new Thread() {
        override def run(): Unit = {
          input
        }
      })
      thread.get.start()
    } catch {
      case t:Throwable =>
        Try(thread.getOrElse(new Thread).interrupt())
        throw t
    }
    thread.get
  }

  def run[T] (input: => T) =
    Future {
      input
    }
}