package gmx.widget.siteextentions.datafeed.service.persistence.patching

import java.time.ZoneOffset
import java.time.ZonedDateTime

import tech.argyll.video.core.sbtech.MarketIdConverter
import tech.argyll.video.domain.model.MarketModel

import gmx.widget.siteextentions.datafeed.service.Elements.MarketUpdate

class MarketModelPatcher {

  def fillNewMarket(target: MarketModel, source: MarketUpdate): Unit = {
    target.setRefId(source.marketId)
    target.setRefIntId(MarketIdConverter.extractOldId(source.marketId).toLong)

    target.setType(source.marketType)
    target.setOriginDate(ZonedDateTime.ofInstant(source.header.originDate, ZoneOffset.UTC))
    updateMetadata(target, source)
  }

  def fillExistingMarket(target: MarketModel, source: MarketUpdate): Unit = {
    target.setRefId(source.marketId)
    target.setOriginDate(ZonedDateTime.ofInstant(source.header.originDate, ZoneOffset.UTC))
    updateMetadata(target, source)
  }

  private def updateMetadata(target: MarketModel, source: MarketUpdate): Unit = {
    target.getProcessingInfo.connectToExecution(source.header.messageId)
    if (source.isDisabled) {
      target.getProcessingInfo.deactivate()
    } else {
      target.getProcessingInfo.activate()
    }
  }
}
