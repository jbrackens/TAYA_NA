package phoenix.main

import kamon.Kamon
import org.slf4j.Logger
import org.slf4j.LoggerFactory

trait Main {

  /**
   * Here is a good idea to try to force an early initialisation of SLF4J to avoid error
   * codes like described here: http://www.slf4j.org/codes.html#replay
   *
   * This is caused by our use of the Oddin oddsfeedsdk within the application.
   * When we move to our own connection to their feed we can remove this.
   */
  protected val log: Logger = LoggerFactory.getLogger(getClass)

  final def main(args: Array[String]): Unit = {
    Kamon.init()
    log.trace("Phoenix Startup...")
    this.runApplication(args)
  }

  def runApplication(args: Array[String]): Unit
}
