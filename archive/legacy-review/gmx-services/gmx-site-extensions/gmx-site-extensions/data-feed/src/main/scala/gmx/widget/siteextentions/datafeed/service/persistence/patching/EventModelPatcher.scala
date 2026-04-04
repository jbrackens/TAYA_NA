package gmx.widget.siteextentions.datafeed.service.persistence.patching

import tech.argyll.video.domain.model.EventModel
import tech.argyll.video.domain.model.SportType

import gmx.common.scala.core.time.TimeUtils.TimeUtilsInstantOps
import gmx.dataapi.internal.siteextensions.event.EventStatusEnum
import gmx.widget.siteextentions.datafeed.service.Elements.EventUpdate
import gmx.widget.siteextentions.datafeed.service.persistence.details.DetailsConverter

class EventModelPatcher(detailsConverter: DetailsConverter) {

  def fillNewEvent(target: EventModel, source: EventUpdate): Unit = {
    target.setRefId(source.eventId)

    target.setPartner(source.header.partner)
    target.setSport(source.sport)
    target.setLeague(source.leagueName)
    target.setLeagueRefId(source.leagueId.toString)
    target.setStartTime(source.startTime.toUtcOffsetDateTime.toZonedDateTime)
    target.setName(source.eventName)

    target.updateDetails(detailsConverter.provideEventDetails(target, source))
    updateMetadata(target, source)
  }

  def fillExistingEvent(target: EventModel, source: EventUpdate): Unit = {
    target.setRefId(source.eventId)

    target.setLeague(source.leagueName)
    target.setLeagueRefId(source.leagueId.toString)
    target.setStartTime(source.startTime.toUtcOffsetDateTime.toZonedDateTime)
    target.setName(source.eventName)

    target.updateDetails(detailsConverter.provideEventDetails(target, source))
    updateMetadata(target, source)
  }

  def fillBusinessMatch(target: EventModel, source: EventUpdate): Unit = {
    target.setRefId(source.eventId)

    target.updateDetails(detailsConverter.provideEventDetails(target, source))
    updateMetadata(target, source)
  }

  private def updateMetadata(target: EventModel, source: EventUpdate): Unit = {
    target.getProcessingInfo.connectToExecution(source.header.messageId)
    if (source.sport == SportType.HORSE_RACING) {
      if (source.isDisabled || source.isLive || EventStatusEnum.Resulted == source.status) {
        target.getProcessingInfo.deactivate()
      } else {
        target.getProcessingInfo.activate()
      }
    } else {
      if (source.isDisabled || source.isLive || EventStatusEnum.NotStarted != source.status) {
        target.getProcessingInfo.deactivate()
      } else {
        target.getProcessingInfo.activate()
      }
    }
  }

}
