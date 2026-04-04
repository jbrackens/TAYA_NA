package gmx.widget.siteextentions.datafeed.service.sportevents.source

import com.typesafe.scalalogging.LazyLogging
import org.apache.avro.specific.SpecificRecord
import org.apache.kafka.clients.consumer.ConsumerRecord
import org.apache.kafka.common.serialization.Deserializer

/**
 * Used to dump data from kafka into separate file / for testing and diagnostics, turned off by -->
 */
class RecordDumpWrapperSerializer(
    topic: String,
    keyDeserializer: Deserializer[SpecificRecord],
    valueDeserializer: Deserializer[SpecificRecord])
    extends EventDeserializer(topic, keyDeserializer, valueDeserializer)
    with LazyLogging {

  override def read(record: ConsumerRecord[Array[Byte], Array[Byte]]): DataRecord = {
    dumpToFile(super.read(record))
  }

  private def dumpToFile[T](msg: DataRecord): DataRecord = {
    //TODO
//    if ("12692960".equals(msg.getExternalUserId.toString)) {
//      logger.debug(msg.toString)
//    }
    msg
  }
}
