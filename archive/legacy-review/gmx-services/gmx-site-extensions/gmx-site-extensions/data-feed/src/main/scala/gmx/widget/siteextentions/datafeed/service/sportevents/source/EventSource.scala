package gmx.widget.siteextentions.datafeed.service.sportevents.source

import akka.stream.scaladsl.Source
import org.apache.kafka.clients.consumer.ConsumerRecord

import gmx.dataapi.internal.siteextensions.SportEventUpdate
import gmx.dataapi.internal.siteextensions.SportEventUpdateKey
import gmx.widget.siteextentions.datafeed.service.sportevents.source.EventSource.AvroEventRecord

trait EventSource[+Mat] {
  def provide: Source[(DataRecord, AvroEventRecord), Mat]
}

object EventSource {
  type AvroEventRecord = ConsumerRecord[Array[Byte], Array[Byte]]
}

trait DataRecord {
  def key: SportEventUpdateKey
}

case class DataUpdate(key: SportEventUpdateKey, value: SportEventUpdate) extends DataRecord

case class DataDelete(key: SportEventUpdateKey) extends DataRecord
