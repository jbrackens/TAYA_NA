package gmx.widget.siteextentions.datafeed.service

import java.time.ZoneOffset
import java.time.ZonedDateTime

import scala.util.Failure
import scala.util.Success
import scala.util.Try
import scala.util.control.NonFatal

import com.typesafe.scalalogging.LazyLogging
import org.quartz.DisallowConcurrentExecution
import org.quartz.Job
import org.quartz.JobExecutionContext
import org.slf4j.MDC
import tech.argyll.video.common.UUID
import tech.argyll.video.domain.model.MessageToRetry
import tech.argyll.video.domain.model.MessageType

import gmx.widget.siteextentions.datafeed.service.Elements.StateUpdate
import gmx.widget.siteextentions.datafeed.service.persistence.MessageLogService
import gmx.widget.siteextentions.datafeed.service.persistence.MessageToRetryService
import gmx.widget.siteextentions.datafeed.service.persistence.StoreUpdateMessageService
import gmx.widget.siteextentions.datafeed.service.sportevents.flow.converter.DataRecordConverter
import gmx.widget.siteextentions.datafeed.service.sportevents.source.KafkaEventSource

// TODO extract a logic from flow; it should not be used here
// the same for source
@DisallowConcurrentExecution
class MessageRetriesJob(
    storeUpdateMessageService: StoreUpdateMessageService,
    messageToRetryService: MessageToRetryService,
    messageLogService: MessageLogService,
    sportEventSource: KafkaEventSource)
    extends Job
    with LazyLogging {
  private val partnerType = messageToRetryService.partnerType

  override def execute(context: JobExecutionContext): Unit = {
    val executionId = UUID.uuid
    MDC.put("executionId", executionId)
    try {
      logger.info("START job for partner {}", partnerType)
      val maxTime = ZonedDateTime.now(ZoneOffset.UTC)
      retryMessages(MessageType.MARKET, maxTime)
      retryMessages(MessageType.SELECTION, maxTime)
      logger.info("END job for partner {}", partnerType)
    } catch {
      case NonFatal(e) =>
        logger.error(s"Job for partner $partnerType finished with error", e)
    } finally MDC.remove("executionId")
  }

  private def retryMessages(messageType: MessageType, maxTime: ZonedDateTime): Unit = {
    var shouldFetchNextEvents = true
    while (shouldFetchNextEvents) {
      val eventsToRetry = messageToRetryService.findMessagesToRetry(messageType, maxTime)
      logger.debug(
        "Fetched {} messages to retry of type {} for partner {}",
        eventsToRetry.length,
        messageType,
        partnerType)
      if (eventsToRetry.isEmpty) shouldFetchNextEvents = false

      eventsToRetry.foreach {
        case (messageToRetry, avroEventRecord) =>
          val dataRecord = sportEventSource.readDataRecord(avroEventRecord)
          Try(DataRecordConverter.convert(dataRecord, partnerType)) match {
            case Success(item) =>
              processRetry(messageToRetry, item)
            case Failure(e) =>
              logger.warn(s"Couldn't convert a fetched message ${messageToRetry.logEntry}", e)
              messageToRetryService.markRejected(messageToRetry)
          }
      }
    }
    logger.debug("No more messages of type {} to retry now", messageType)
  }

  private def processRetry(messageToRetry: MessageToRetry, item: StateUpdate): Unit = {
    if (messageLogService.shouldRetry(item)) {
      val succeeded = storeUpdateMessageService.storeUpdate(item)
      if (succeeded) {
        messageToRetryService.markProcessed(messageToRetry)
      } else {
        messageToRetryService.markForNextRetry(messageToRetry)
      }
    } else {
      messageToRetryService.markRejected(messageToRetry)
    }
  }
}
