package gmx.widget.siteextentions.datafeed.service.persistence

import scala.concurrent.duration.DurationInt
import scala.util.Try

import com.github.blemale.scaffeine.LoadingCache
import com.github.blemale.scaffeine.Scaffeine
import tech.argyll.video.domain.model.MessageLog
import tech.argyll.video.domain.model.MessageType
import tech.argyll.video.domain.model.PartnerType

import gmx.widget.siteextentions.datafeed.service.Elements.EventDelete
import gmx.widget.siteextentions.datafeed.service.Elements.EventUpdate
import gmx.widget.siteextentions.datafeed.service.Elements.MarketDelete
import gmx.widget.siteextentions.datafeed.service.Elements.MarketUpdate
import gmx.widget.siteextentions.datafeed.service.Elements.SelectionDelete
import gmx.widget.siteextentions.datafeed.service.Elements.SelectionUpdate
import gmx.widget.siteextentions.datafeed.service.Elements.StateUpdate

class MessageLogService(val partnerType: PartnerType, messageLogDao: MessageLogDao) {

  private lazy val tableCache: LoadingCache[CacheKey, Option[Boolean]] =
    Scaffeine().expireAfterWrite(30.minutes).maximumSize(100000).build(loader = loadKey)

  private def loadKey(key: CacheKey): Option[Boolean] = {
    messageLogDao.find(partnerType, key.messageType, key.refId).map(_.isRejected)
  }

  def storeMessageLog(item: MessageLog): Unit = {
    // we do not need updating existing row, we can fail on duplicate, that could be faster
    Try {
      item.save()
      tableCache.invalidate(CacheKey(item.getMessageType, item.getRefId))
    }
  }

  def shouldRetry(item: StateUpdate): Boolean = {
    item match {
      case _: EventUpdate =>
        true
      case e: EventDelete =>
        wasProcessed(MessageType.EVENT, e.eventId)
      case m: MarketUpdate =>
        !wasRejected(MessageType.EVENT, m.eventId)
      case m: MarketDelete =>
        wasProcessed(MessageType.MARKET, m.marketId)
      case s: SelectionUpdate =>
        !wasRejected(MessageType.EVENT, s.eventId) &&
        !wasRejected(MessageType.MARKET, s.marketId)
      case s: SelectionDelete =>
        wasProcessed(MessageType.SELECTION, s.selectionId)
    }
  }

  private def wasProcessed(messageType: MessageType, refId: String): Boolean =
    tableCache.get(CacheKey(messageType, refId)).exists(!_.booleanValue())
//    messageLogDao.find(partnerType, messageType, refId).exists(!_.isRejected)

  private def wasRejected(messageType: MessageType, refId: String): Boolean =
    tableCache.get(CacheKey(messageType, refId)).exists(_.booleanValue())
//    messageLogDao.find(partnerType, messageType, refId).exists(_.isRejected)

  private case class CacheKey(messageType: MessageType, refId: String)

}
