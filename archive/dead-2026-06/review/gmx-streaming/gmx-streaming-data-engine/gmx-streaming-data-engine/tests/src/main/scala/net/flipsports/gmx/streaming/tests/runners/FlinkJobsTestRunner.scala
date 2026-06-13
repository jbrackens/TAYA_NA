package net.flipsports.gmx.streaming.tests.runners

import scala.util.Try

trait FlinkJobsTestRunner {

  def withFlink[T](miniClusterResource: FlinkMiniClusterRunner)(test: FlinkMiniClusterRunner => T) {
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


}

object FlinkJobsTestRunner {

  val taskManagers = 1

  val slotsPerTaskManager = 2

}
