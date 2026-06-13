package net.flipsports.gmx.streaming.tests.utils

trait Retriable {

  def retryNumberOfTimes[T](n: Int)(fn: => T): T = {
    util.Try { fn } match {
      case util.Success(x) => x
      case _ if n > 1 => retryNumberOfTimes(n - 1)(fn)
      case util.Failure(e) => throw e
    }
  }
}
