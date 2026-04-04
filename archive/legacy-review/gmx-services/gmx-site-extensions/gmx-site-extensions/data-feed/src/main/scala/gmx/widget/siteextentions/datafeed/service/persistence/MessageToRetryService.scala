package gmx.widget.siteextentions.datafeed.service.persistence

import java.time.ZoneOffset
import java.time.ZonedDateTime
import java.util.Base64

import scala.concurrent.duration.FiniteDuration

import com.typesafe.scalalogging.LazyLogging
import org.apache.kafka.clients.consumer.ConsumerRecord
import tech.argyll.video.domain.model.MessageToRetry
import tech.argyll.video.domain.model.MessageToRetryStatus
import tech.argyll.video.domain.model.MessageType
import tech.argyll.video.domain.model.PartnerType

import gmx.widget.siteextentions.datafeed.service.Elements.EventDelete
import gmx.widget.siteextentions.datafeed.service.Elements.EventUpdate
import gmx.widget.siteextentions.datafeed.service.Elements.MarketDelete
import gmx.widget.siteextentions.datafeed.service.Elements.MarketUpdate
import gmx.widget.siteextentions.datafeed.service.Elements.SelectionDelete
import gmx.widget.siteextentions.datafeed.service.Elements.SelectionUpdate
import gmx.widget.siteextentions.datafeed.service.Elements.StateUpdate
import gmx.widget.siteextentions.datafeed.service.sportevents.MessageToRetryPersistenceConfig
import gmx.widget.siteextentions.datafeed.service.sportevents.source.EventSource.AvroEventRecord

class MessageToRetryService(
    val partnerType: PartnerType,
    persistenceConfig: MessageToRetryPersistenceConfig,
    dao: MessageToRetryDao)
    extends LazyLogging {

  def storeNewEntry(item: StateUpdate, avroEventRecord: AvroEventRecord): Unit =
    if (persistenceConfig.maxRetries > 0) {
      val messageToRetry = new MessageToRetry()
      messageToRetry.setRetriesSoFar(0)
      messageToRetry.setNextRetryDate(
        ZonedDateTime.now(ZoneOffset.UTC).plusNanos(persistenceConfig.firstRetryDelay.toNanos))
      messageToRetry.setMessageKey(toBase64(avroEventRecord.key()))
      messageToRetry.setMessageValue(Option(avroEventRecord.value()).map(toBase64).orNull)
      messageToRetry.setPartnerType(partnerType)
      messageToRetry.setStatus(MessageToRetryStatus.TO_DO)
      setTypeSpecific(item, messageToRetry)
      messageToRetry.save()
      logger.debug("{} stored and will be processed once again later", messageToRetry.logEntry)
    }

  private def setTypeSpecific(item: StateUpdate, target: MessageToRetry): Unit =
    item match {
      case e: EventUpdate =>
        target.setMessageType(MessageType.EVENT)
        target.setEventRefId(e.eventId)
      case e: EventDelete =>
        target.setMessageType(MessageType.EVENT)
        target.setEventRefId(e.eventId)
      case m: MarketUpdate =>
        target.setMessageType(MessageType.MARKET)
        target.setEventRefId(m.eventId)
        target.setMarketRefId(m.marketId)
      case m: MarketDelete =>
        target.setMessageType(MessageType.MARKET)
        target.setMarketRefId(m.marketId)
      case s: SelectionUpdate =>
        target.setMessageType(MessageType.SELECTION)
        target.setEventRefId(s.eventId)
        target.setMarketRefId(s.marketId)
        target.setSelectionRefId(s.selectionId)
      case s: SelectionDelete =>
        target.setMessageType(MessageType.SELECTION)
        target.setSelectionRefId(s.selectionId)
    }

  def markForNextRetry(messageToRetry: MessageToRetry): Unit = {
    val numberOfRetries = messageToRetry.getRetriesSoFar + 1
    if (numberOfRetries < persistenceConfig.maxRetries) {
      logger.debug(
        "Updating {}. It could not be applied properly after {} retries",
        messageToRetry.logEntry,
        numberOfRetries)
      messageToRetry.setRetriesSoFar(numberOfRetries)
      val nextDelay = persistenceConfig.firstRetryDelay.toNanos * scala.math
          .pow(persistenceConfig.nextRetriesDelayMultiplier, numberOfRetries)
          .toLong
      messageToRetry.setNextRetryDate(ZonedDateTime.now(ZoneOffset.UTC).plusNanos(nextDelay))
      messageToRetry.save()
    } else {
      logger.warn(
        "Marking {} as {} because it could not be processed properly after {} retries",
        messageToRetry.logEntry,
        MessageToRetryStatus.EXCEEDED.getStringID,
        numberOfRetries)
      messageToRetry.setStatus(MessageToRetryStatus.EXCEEDED)
      messageToRetry.save()
    }
  }

  def markProcessed(messageToRetry: MessageToRetry): Unit = {
    logger.debug(
      "Marking {} as {} because a retry succeeded",
      messageToRetry.logEntry,
      MessageToRetryStatus.PROCESSED.getStringID)
    messageToRetry.setStatus(MessageToRetryStatus.PROCESSED)
    messageToRetry.save()
  }

  def markRejected(messageToRetry: MessageToRetry): Unit = {
    logger.debug(
      "Marking {} as {} because it's not supported",
      messageToRetry.logEntry,
      MessageToRetryStatus.REJECTED.getStringID)
    messageToRetry.setStatus(MessageToRetryStatus.REJECTED)
    messageToRetry.save()
  }

  def findMessagesToRetry(messageType: MessageType, maxTime: ZonedDateTime): List[(MessageToRetry, AvroEventRecord)] =
    dao
      .findMessagesToRetry(partnerType, messageType, maxTime, persistenceConfig.retryEventsBatchSize)
      .map(message => (message, toAvroMessageRecord(message)))

  def deleteProcessedAndAbandonedMessages(retriedEarlierThan: FiniteDuration): Unit =
    dao.deleteProcessedAndAbandonedMessages(partnerType, retriedEarlierThan)

  private def toBase64(bytes: Array[Byte]): String = Base64.getEncoder.encodeToString(bytes)

  private def fromBase64(string: String): Array[Byte] = Base64.getDecoder.decode(string)

  private def toAvroMessageRecord(event: MessageToRetry): AvroEventRecord = {
    val key = fromBase64(event.getMessageKey)
    val value = Option(event.getMessageValue).map(fromBase64).orNull
    // let's use some dummy data for fields other than key and value
    val fakeTopic = "dummy-topic-name"
    val fakePartition = 0
    val fakeOffset = 0
    new ConsumerRecord[Array[Byte], Array[Byte]](fakeTopic, fakePartition, fakeOffset, key, value)
  }

}
