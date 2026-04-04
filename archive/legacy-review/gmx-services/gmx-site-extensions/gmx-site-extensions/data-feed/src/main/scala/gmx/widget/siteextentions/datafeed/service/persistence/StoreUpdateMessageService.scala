package gmx.widget.siteextentions.datafeed.service.persistence

import scala.util.Failure
import scala.util.Success
import scala.util.Try

import com.typesafe.scalalogging.LazyLogging
import tech.argyll.video.domain.model.MessageType

import gmx.widget.siteextentions.datafeed.service.Elements._
import gmx.widget.siteextentions.datafeed.service.sportevents.source.EventSource.AvroEventRecord

class StoreUpdateMessageService(
    processor: StateUpdateProcessor,
    messageToRetryService: MessageToRetryService,
    messageLogService: MessageLogService)
    extends LazyLogging {

  def storeUpdateFromSink(item: StateUpdate, avroEventRecord: AvroEventRecord): Unit = {
    val succeeded = storeUpdate(item)
    if (!succeeded) {
      if (messageLogService.shouldRetry(item)) {
        messageToRetryService.storeNewEntry(item, avroEventRecord)
      } else {
        logger.debug(s"Parent rejected for ${item.logEntry} or delete without messageLog - skipping")
      }
    }
  }

  def storeUpdate(item: StateUpdate): Boolean = {
//    synchronized { //TODO synchronized will slow down A LOT! and collisions would be handled by unique index
    val result = Try(processor.persist(item))
    result match {
      case Success(dbId) =>
        logger.info(s"${item.getClass.getSimpleName} stored with dbID=$dbId for ${item.logEntry}")
        true
      case Failure(e: ProcessorException) =>
        logger.debug(s"Processor exception '${e.getMessage}' while persisting: $item")
        false
      case Failure(e) =>
        logger.error(s"Unexpected exception while persisting: $item", e)
        false
    }
  }
}
