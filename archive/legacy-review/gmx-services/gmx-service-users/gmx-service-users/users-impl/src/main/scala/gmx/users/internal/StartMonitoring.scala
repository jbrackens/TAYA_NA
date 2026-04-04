package gmx.users.internal

import kamon.Kamon
import org.slf4j.LoggerFactory
import play.api.inject.ApplicationLifecycle
import play.api.{ Configuration, Environment }

class StartMonitoring(
    lifecycle: ApplicationLifecycle,
    environment: Environment,
    configuration: Configuration) {

  val log = LoggerFactory.getLogger(classOf[StartMonitoring])

  log.info("Reconfiguring Kamon with Play's Config")

  Kamon.reconfigure(configuration.underlying)
  Kamon.loadModules()
//  Kamon.init()

  //  val counter = Kamon.counter("app.orders.sent")
  //  counter.withoutTags().increment()
  //
  //  lifecycle.addStopHook { () ⇒
  //    if (environment.mode != Mode.Dev)
  //      Kamon.stopModules()
  //    else
  //      Future.successful(())
  //  }
}
