package gmx.widget.siteextentions.datafeed.service.persistence

import java.time.ZoneOffset
import java.time.ZonedDateTime

import com.typesafe.scalalogging.LazyLogging
import tech.argyll.video.domain.MarketDao
import tech.argyll.video.domain.SelectionDao
import tech.argyll.video.domain.model.SelectionModel

import gmx.widget.siteextentions.datafeed.service.Elements.SelectionDelete
import gmx.widget.siteextentions.datafeed.service.Elements.SelectionUpdate
import gmx.widget.siteextentions.datafeed.service.persistence.patching.SelectionModelPatcher

class SelectionUpdateProcessor(marketDao: MarketDao, selectionDao: SelectionDao, modelPatcher: SelectionModelPatcher)
    extends LazyLogging {

  /**
   * New ID format, sample: "0QA68534498#846356381_13L198791Q1795226Q2-1"
   * ??? =                0QA +
   * marketId =           68534498 +
   * separator =          # +
   * lineIntId =          846356381 +
   * separator =          _ +
   * lineTypeId =         13 +
   * separator =          L +
   * leagueID =           198791 +
   * ??? =                Q1 +
   * participantMapping = 795226 +
   * ??? =                Q2-1
   */
  private val qaIdPattern = ".*QA.*#(\\d+)_.*L(\\d+)Q.*".r

  def process(selectionUpdate: SelectionUpdate): SelectionModel = createOrUpdate(selectionUpdate)

  private def createOrUpdate(selectionUpdate: SelectionUpdate): SelectionModel = {
    var model = selectionDao.findByRefIdAndPartner(selectionUpdate.selectionId, selectionUpdate.header.partner)
    if (model != null) {
      updateSelection(model, selectionUpdate)
    } else {
      val oldId = extractOldId(selectionUpdate)
      model = selectionDao.findByOldRefIdAndPartner(oldId, selectionUpdate.header.partner)
      if (model != null) {
        updateSelection(model, selectionUpdate)
      } else {
        createSelection(selectionUpdate)
      }
    }
  }

  def extractOldId(selectionUpdate: SelectionUpdate): String = {
    selectionUpdate.selectionId match {
      case qaIdPattern(intId, leagueId) => s"Q${intId}_$leagueId"
      case _                            => s"R${selectionUpdate.selectionIntId}"
    }
  }

  private def createSelection(source: SelectionUpdate): SelectionModel = {
    logger.debug("Creating new Selection for {}", source.logEntry)
    val target = new SelectionModel
    attachToMarket(target, source)
    modelPatcher.fillNewSelection(target, source)

    target.save()
    target
  }

  private def attachToMarket(target: SelectionModel, source: SelectionUpdate): Unit = {
    val marketModel = marketDao.findByRefIdAndPartner(source.marketId, source.header.partner)
    if (marketModel == null) {
      throw new ProcessorException(s"Cannot find Market to attach for ${source.logEntry}")
    } else {
      marketModel.addSelection(target)
    }
  }

  private def updateSelection(target: SelectionModel, source: SelectionUpdate): SelectionModel = {
    val targetOriginDate = target.getOriginDate.withZoneSameInstant(ZoneOffset.UTC)
    val sourceOriginDate = ZonedDateTime.ofInstant(source.header.originDate, ZoneOffset.UTC)
    val isMessageOutdated =
      targetOriginDate.compareTo(sourceOriginDate) > 0
    if (isMessageOutdated)
      logger.debug(
        "Selection message is outdated ({} > {}) and won't be applied {}",
        targetOriginDate,
        sourceOriginDate,
        source.logEntry)
    else {
      logger.debug("Updating existing Selection for {}", source.logEntry)
      modelPatcher.fillExistingSelection(target, source)

      target.save()
    }
    target
  }

  def process(selectionDelete: SelectionDelete): SelectionModel = {
    val model = selectionDao.findByRefIdAndPartner(selectionDelete.selectionId, selectionDelete.header.partner)
    if (model == null) {
      throw new ProcessorException(s"Cannot find Selection to delete for ${selectionDelete.logEntry}")
    }

    model.getProcessingInfo.deactivate()
    model.save()
    model
  }
}
