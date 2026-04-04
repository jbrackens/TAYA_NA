package gmx.widget.siteextentions.datafeed.service.persistence

import com.typesafe.scalalogging.LazyLogging
import tech.argyll.video.domain.EventDao
import tech.argyll.video.domain.model.EventModel

import gmx.common.scala.core.time.TimeUtils.TimeUtilsInstantOps
import gmx.widget.siteextentions.datafeed.service.Elements._
import gmx.widget.siteextentions.datafeed.service.persistence.patching.EventModelPatcher

class EventUpdateProcessor(eventDao: EventDao, modelPatcher: EventModelPatcher) extends LazyLogging {

  def process(eventUpdate: EventUpdate): EventModel = {
    val model = createOrUpdate(eventUpdate)
    // TODO (GM-1746): map participant details into selections (to replace PA feed)
    model.save()
    model
  }

  private def createOrUpdate(eventUpdate: EventUpdate): EventModel = {
    var model = eventDao.findByRefIdAndPartner(eventUpdate.eventId, eventUpdate.header.partner)
    if (model != null) {
      updateEvent(model, eventUpdate)
    } else {
      model = eventDao.findByBusinessKey(
        new EventDao.EventBusinessKey(
          eventUpdate.header.partner,
          eventUpdate.sport,
          eventUpdate.leagueName,
          eventUpdate.startTime.toUtcOffsetDateTime.toZonedDateTime,
          eventUpdate.eventName))
      if (model != null) {
        updateBusinessMatch(model, eventUpdate)
      } else {
        createEvent(eventUpdate)
      }
    }
  }

  private def createEvent(source: EventUpdate): EventModel = {
    logger.debug("Creating new Event for {}", source.logEntry)
    val target = new EventModel
    modelPatcher.fillNewEvent(target, source)

    target
  }

  private def updateBusinessMatch(target: EventModel, source: EventUpdate): EventModel = {
    logger.debug("Updating businessMatch Event for {}", source.logEntry)
    modelPatcher.fillBusinessMatch(target, source)

    target
  }

  private def updateEvent(target: EventModel, source: EventUpdate): EventModel = {
    logger.debug("Updating existing Event for {}", source.logEntry)
    modelPatcher.fillExistingEvent(target, source)

    target
  }

  def process(eventDelete: EventDelete): EventModel = {
    val model = eventDao.findByRefIdAndPartner(eventDelete.eventId, eventDelete.header.partner)

    if (model == null) {
      throw new ProcessorException(s"Cannot find Event to delete for ${eventDelete.logEntry}")
    }

    model.getProcessingInfo.deactivate()
    model.save()
    model
  }
}
