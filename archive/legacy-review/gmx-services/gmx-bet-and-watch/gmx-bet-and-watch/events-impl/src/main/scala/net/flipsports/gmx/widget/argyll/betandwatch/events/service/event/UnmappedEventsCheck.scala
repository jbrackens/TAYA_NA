package net.flipsports.gmx.widget.argyll.betandwatch.events.service.event

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.widget.argyll.betandwatch.events.model.{EventMapping, EventMappingDisplay}
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.ScheduledService

import scala.concurrent.duration.FiniteDuration
import scala.concurrent.{ExecutionContext, Future}

class UnmappedEventsCheck(eventsLookup: EventsLookup, checkConfig: UnmappedEventsCheckConfig)
                         (implicit val ec: ExecutionContext)
  extends ScheduledService
    with LazyLogging
    with EventMappingDisplay {

  override def shouldExecute(): Boolean = checkConfig.verificationEnabled

  override def delayedInit(): Boolean = true

  override def scheduleInterval(): FiniteDuration = checkConfig.interval

  override def runScheduled(): Future[Unit] = {
    eventsLookup.getMapping
        .map(mappings => {
          logger.whenDebugEnabled {
            logger.debug(s"Current state to check: ${mappings
              .map(displayMappings).mkString(System.lineSeparator())}")
          }
          mappings
        })
      .map(_.filter(_.stream.isEmpty))
      .map(logMissing)
  }

  private def logMissing(mappings: Seq[EventMapping]): Unit = {
    if (mappings.nonEmpty) {
      logger.warn(s"Missing stream for SBT events: ${mappings.map(displayEvent).mkString(System.lineSeparator(), System.lineSeparator(), "")}")
    } else {
      logger.info(s"All SBT events mapped with stream.")
    }
  }

  private def displayEvent(mapping: EventMapping): String = {
    s"${display(mapping.event)} provided by ${mapping.provider}"
  }

}
