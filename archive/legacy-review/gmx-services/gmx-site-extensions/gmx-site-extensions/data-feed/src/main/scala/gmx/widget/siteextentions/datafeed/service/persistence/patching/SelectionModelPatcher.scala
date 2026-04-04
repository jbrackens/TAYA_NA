package gmx.widget.siteextentions.datafeed.service.persistence.patching

import java.time.ZoneOffset
import java.time.ZonedDateTime

import tech.argyll.video.core.price.Price
import tech.argyll.video.domain.model.SelectionModel
import tech.argyll.video.domain.model.SelectionType

import gmx.dataapi.internal.siteextensions.selection.SelectionOddsTypeEnum
import gmx.widget.siteextentions.datafeed.service.Elements.SelectionUpdate
import gmx.widget.siteextentions.datafeed.service.persistence.details.DetailsConverter

class SelectionModelPatcher(detailsConverter: DetailsConverter) {

  def fillNewSelection(target: SelectionModel, source: SelectionUpdate): Unit = {
    target.setRefId(source.selectionId)
    target.setRefIntId(source.selectionIntId)

    target.setName(source.selectionName)
    target.setType(source.selectionType)
    //    target.setIndex(input.getIndex) // TODO (GM-1742): is index needed?
    updatePrice(target, source)

    target.updateDetails(detailsConverter.provideSelectionDetails(target, source))
    target.setOriginDate(ZonedDateTime.ofInstant(source.header.originDate, ZoneOffset.UTC))
    updateMetadata(target, source)
  }

  def fillExistingSelection(target: SelectionModel, source: SelectionUpdate): Unit = {
    target.setRefId(source.selectionId)
    target.setRefIntId(source.selectionIntId)

    updatePrice(target, source)

    target.updateDetails(detailsConverter.provideSelectionDetails(target, source))
    target.setOriginDate(ZonedDateTime.ofInstant(source.header.originDate, ZoneOffset.UTC))
    updateMetadata(target, source)
  }

  private def updatePrice(target: SelectionModel, source: SelectionUpdate) = {
    if (source.selectionType != SelectionType.STARTING_PRICE) {
      target.setPrice(
        source.displayOdds
          .get(SelectionOddsTypeEnum.Fractional)
          .map(Price.from(_, Price.Type.FRACTIONAL))
          .get
          .fractional()
      ) // TODO (GM-1742): validate price
    } else {
      target.setPrice("0")
    }
  }

  private def updateMetadata(target: SelectionModel, source: SelectionUpdate): Unit = {
    target.getProcessingInfo.connectToExecution(source.header.messageId)
    if (source.isDisabled) {
      target.getProcessingInfo.deactivate()
    } else {
      target.getProcessingInfo.activate()
    }
  }
}
