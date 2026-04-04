package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.serializer

import java.nio.file.{Files, Path, Paths}
import java.util.UUID

import net.flipsports.gmx.racingroulette.api.Event
import org.apache.avro.specific.SpecificRecord
import org.apache.kafka.common.serialization.Deserializer

/**
 * Wrapper for BinarySerializer that writes incoming records (byte array) to filesystem. Useful for tests input.
 */
class RecordDumpWrapperSerializer(topic: String, underlying: Deserializer[SpecificRecord]) extends EventDeserializer(topic, underlying) {

  override def read(item: Array[Byte]): Event = {
    dumpToFile(item, classOf[Event])
    super.read(item)
  }

  private def dumpToFile[T](item: Array[Byte], clazz: Class[T]) = {
    val dir = "" //local path here
    val path: Path = Paths.get(s"$dir/${clazz.getSimpleName}/${UUID.randomUUID()}")
    Files.write(path, item)
  }
}
