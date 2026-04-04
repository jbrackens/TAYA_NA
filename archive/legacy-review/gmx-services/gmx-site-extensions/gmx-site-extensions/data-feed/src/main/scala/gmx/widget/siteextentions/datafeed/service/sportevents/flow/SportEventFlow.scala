package gmx.widget.siteextentions.datafeed.service.sportevents.flow

import scala.util.Failure
import scala.util.Success
import scala.util.Try

import akka.NotUsed
import akka.stream.scaladsl.Flow
import com.typesafe.scalalogging.LazyLogging
import tech.argyll.video.domain.model.MessageLog
import tech.argyll.video.domain.model.MessageType
import tech.argyll.video.domain.model.PartnerType

import gmx.dataapi.internal.siteextensions.SportEventUpdateType
import gmx.widget.siteextentions.datafeed.service.Elements.StateUpdate
import gmx.widget.siteextentions.datafeed.service.persistence.MessageLogService
import gmx.widget.siteextentions.datafeed.service.sportevents.flow.converter.ConverterException
import gmx.widget.siteextentions.datafeed.service.sportevents.flow.converter.DataRecordConverter
import gmx.widget.siteextentions.datafeed.service.sportevents.source.DataDelete
import gmx.widget.siteextentions.datafeed.service.sportevents.source.DataRecord
import gmx.widget.siteextentions.datafeed.service.sportevents.source.DataUpdate
import gmx.widget.siteextentions.datafeed.service.sportevents.source.EventSource.AvroEventRecord

class SportEventFlow(partnerType: PartnerType, messageLogService: MessageLogService) extends LazyLogging {

  def provide[T]: Flow[(DataRecord, AvroEventRecord), (StateUpdate, AvroEventRecord), NotUsed] = {
    Flow[(DataRecord, AvroEventRecord)]
      .map(record => { //TODO fix logging
//        logger.info(s"${record.getClass.getSimpleName}(type: ${record.key.getType}, id: ${record.key.getId})")
        logger.info(s"${record._1}")
        record
      })
      .map { case (item, avroEventRecord) => convertRecordForFlow(item, avroEventRecord) }
      .collect {
        case Success(result) => result
      }
  }

  private def convertRecordForFlow(
      item: DataRecord,
      avroEventRecord: AvroEventRecord): Try[(StateUpdate, AvroEventRecord)] =
    convertRecord(item).map(_ -> avroEventRecord)

  private def convertRecord(item: DataRecord): Try[StateUpdate] = {
    val result = Try(DataRecordConverter.convert(item, partnerType))
    result match {
      case Success(_) =>
        storeMessageLog(item, false)
      case Failure(e: ConverterException) =>
        storeMessageLog(item, true)
        logger.debug(s"Converter exception '${e.getMessage}' while parsing: $item")
      case Failure(e) =>
        storeMessageLog(item, true)
        logger.error(s"Unexpected exception while parsing: $item", e)
    }
    result
  }

  private def storeMessageLog(item: DataRecord, rejected: Boolean): Unit = {
    item match {
      case DataUpdate(_, _) =>
        val messageType = item.key.getType match {
          case SportEventUpdateType.Event     => MessageType.EVENT
          case SportEventUpdateType.Market    => MessageType.MARKET
          case SportEventUpdateType.Selection => MessageType.SELECTION
        }

        val result = new MessageLog()
        result.setPartnerType(partnerType)
        result.setMessageType(messageType)
        result.setRefId(item.key.getId.toString)
        result.setRejected(rejected)
        messageLogService.storeMessageLog(result)
      case DataDelete(_) =>
        logger.debug(s"Skipping MessageLog for DataDelete with key: ${item.key}")
    }
  }
}
