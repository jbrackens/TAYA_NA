package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.serializer

import com.typesafe.config.Config
import net.flipsports.gmx.racingroulette.api.Event
import org.apache.avro.specific.SpecificRecord
import org.apache.kafka.common.serialization.Deserializer

class EventDeserializer(topic: String, underlying: Deserializer[SpecificRecord]) {

  def read(item: Array[Byte]): Event = {
    val record = underlying.deserialize(topic, item)
    record.asInstanceOf[Event]
  }

}

object EventDeserializer {
  def apply(topic: String, underlying: Deserializer[SpecificRecord])(implicit config: Config): EventDeserializer = {
    val dumpRecordsEnabled = config.getBoolean("app.event-updates.kafka-source.dump-records")

    if (dumpRecordsEnabled) {
      new RecordDumpWrapperSerializer(topic, underlying)
    } else {
      new EventDeserializer(topic, underlying)
    }
  }
}
