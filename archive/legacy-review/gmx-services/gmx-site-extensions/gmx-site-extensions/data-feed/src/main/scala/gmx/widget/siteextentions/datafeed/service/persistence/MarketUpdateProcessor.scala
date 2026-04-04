package gmx.widget.siteextentions.datafeed.service.persistence

import java.time.ZoneOffset
import java.time.ZonedDateTime

import com.typesafe.scalalogging.LazyLogging
import tech.argyll.video.core.sbtech.MarketIdConverter
import tech.argyll.video.domain.EventDao
import tech.argyll.video.domain.MarketDao
import tech.argyll.video.domain.model.MarketModel

import gmx.widget.siteextentions.datafeed.service.Elements.MarketDelete
import gmx.widget.siteextentions.datafeed.service.Elements.MarketUpdate
import gmx.widget.siteextentions.datafeed.service.persistence.patching.MarketModelPatcher

class MarketUpdateProcessor(eventDao: EventDao, marketDao: MarketDao, modelPatcher: MarketModelPatcher)
    extends LazyLogging {

  def process(marketUpdate: MarketUpdate): MarketModel = createOrUpdate(marketUpdate)

  private def createOrUpdate(marketUpdate: MarketUpdate): MarketModel = {
    var model = marketDao.findByRefIdAndPartner(marketUpdate.marketId, marketUpdate.header.partner)
    if (model != null) {
      updateMarket(model, marketUpdate)
    } else {
      val oldId = MarketIdConverter.extractOldId(marketUpdate.marketId)
      model = marketDao.findByOldRefIdPartnerAndType(oldId, marketUpdate.header.partner, marketUpdate.marketType)
      if (model != null) {
        updateMarket(model, marketUpdate)
      } else {
        createMarket(marketUpdate)
      }
    }
  }

  private def createMarket(source: MarketUpdate): MarketModel = {
    logger.debug("Creating new Market for {}", source.logEntry)
    val target = new MarketModel
    attachToEvent(target, source)
    modelPatcher.fillNewMarket(target, source)

    target.save()
    target
  }

  private def attachToEvent(target: MarketModel, source: MarketUpdate): Unit = {
    val eventModel = eventDao.findByRefIdAndPartner(source.eventId, source.header.partner)
    if (eventModel == null) {
      throw new ProcessorException(s"Cannot find Event to attach for ${source.logEntry}")
    } else {
      eventModel.addMarket(target)
    }
  }

  private def updateMarket(target: MarketModel, source: MarketUpdate): MarketModel = {
    val targetOriginDate = target.getOriginDate.withZoneSameInstant(ZoneOffset.UTC)
    val sourceOriginDate = ZonedDateTime.ofInstant(source.header.originDate, ZoneOffset.UTC)
    val isMessageOutdated =
      targetOriginDate.compareTo(sourceOriginDate) > 0
    if (isMessageOutdated)
      logger.debug(
        "Market message is outdated ({} > {}) and won't be applied {}",
        targetOriginDate,
        sourceOriginDate,
        source.logEntry)
    else {
      logger.debug("Updating existing Market for {}", source.logEntry)
      modelPatcher.fillExistingMarket(target, source)
      target.save()
    }
    target
  }

  def process(marketDelete: MarketDelete): MarketModel = {
    val model = marketDao.findByRefIdAndPartner(marketDelete.marketId, marketDelete.header.partner)

    if (model == null) {
      throw new ProcessorException(s"Cannot find Market to delete for ${marketDelete.logEntry}")
    }

    model.getProcessingInfo.deactivate()
    model.save()
    model
  }
}
