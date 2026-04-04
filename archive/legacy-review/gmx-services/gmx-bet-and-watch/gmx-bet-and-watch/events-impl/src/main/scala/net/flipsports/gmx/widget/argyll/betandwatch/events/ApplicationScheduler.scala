package net.flipsports.gmx.widget.argyll.betandwatch.events

import akka.actor.ActorSystem
import akka.stream.Materializer
import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.ScheduledService
import org.apache.commons.lang3.time.DurationFormatUtils

import scala.concurrent.duration.{Duration, FiniteDuration}
import scala.concurrent.{Await, ExecutionContext}

class ApplicationScheduler(scheduled: Set[ScheduledService])
                          (system: ActorSystem)
                          (implicit val mat: Materializer, ec: ExecutionContext)
  extends LazyLogging {

  def start(): Unit = {
    scheduled
      .filter(shouldExecute)
      .foreach(scheduleExecution)
  }

  private def shouldExecute(service: ScheduledService): Boolean = {
    if (!service.shouldExecute()) {
      logger.info(s"${service.getClass.getSimpleName} disabled - skip scheduling")
    }
    service.shouldExecute()
  }

  private def scheduleExecution(service: ScheduledService): Unit = {
    logger.info(s"${service.getClass.getSimpleName} scheduled every ${printDuration(service.scheduleInterval())}")

    val interval = service.scheduleInterval()
    val initDelay = if (service.delayedInit()) interval else Duration.Zero

    system.scheduler.schedule(initDelay, interval) {
      try {
        val serviceExecution = service.runScheduled()
        Await.result(serviceExecution, service.scheduleInterval())
      } catch {
        case e: Exception => logger.error(s"Unexpected error while runScheduled() of ${service.getClass.getSimpleName}", e)
      }
    }
  }

  private def printDuration(duration: FiniteDuration) =
    DurationFormatUtils.formatDurationWords(duration.toMillis, true, true)
}
