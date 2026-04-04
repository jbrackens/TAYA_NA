package gmx.widget.siteextentions.datafeed.service.sportevents.source

import org.apache.avro.specific.SpecificRecord
import org.apache.kafka.clients.consumer.ConsumerRecord
import org.apache.kafka.common.serialization.Deserializer

import gmx.dataapi.internal.siteextensions.SportEventUpdate
import gmx.dataapi.internal.siteextensions.SportEventUpdateKey
import gmx.widget.siteextentions.datafeed.service.sportevents.SportEventsConfig

class EventDeserializer(
    topic: String,
    keyDeserializer: Deserializer[SpecificRecord],
    valueDeserializer: Deserializer[SpecificRecord]) {
  def read(record: ConsumerRecord[Array[Byte], Array[Byte]]): DataRecord = {
    val key = keyDeserializer.deserialize(topic, record.key()).asInstanceOf[SportEventUpdateKey]
    if (record.value() != null && !record.value().isEmpty) {
      val value = valueDeserializer.deserialize(topic, record.value()).asInstanceOf[SportEventUpdate]
      DataUpdate(key, value)
    } else {
      DataDelete(key)
    }
  }
}

object EventDeserializer {
  def apply(
      topic: String,
      keyDeserializer: Deserializer[SpecificRecord],
      valueDeserializer: Deserializer[SpecificRecord])(implicit
      sportEventsConfig: SportEventsConfig): EventDeserializer = {
    if (sportEventsConfig.kafkaSource.dumpRecords) {
      new RecordDumpWrapperSerializer(topic, keyDeserializer, valueDeserializer)
    } else {
      new EventDeserializer(topic, keyDeserializer, valueDeserializer)
    }
  }
}
