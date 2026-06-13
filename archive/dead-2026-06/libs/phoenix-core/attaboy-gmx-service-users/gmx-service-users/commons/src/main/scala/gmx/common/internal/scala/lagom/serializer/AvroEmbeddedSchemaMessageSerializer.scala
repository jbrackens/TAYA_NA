package gmx.common.internal.scala.lagom.serializer

import java.io.ByteArrayOutputStream

import akka.util.ByteString
import com.lightbend.lagom.scaladsl.api.deser.MessageSerializer.NegotiatedDeserializer
import org.apache.avro.Schema
import org.apache.avro.io.{ DecoderFactory, EncoderFactory }
import org.apache.avro.specific.{ SpecificDatumReader, SpecificDatumWriter, SpecificRecordBase }

import scala.reflect.{ classTag, ClassTag }
import scala.util.{ Failure, Success, Try }

/**
 * A Lagom MessageSerializer which embeds the schema for the message in the message itself.
 * This can be used when we want to use Avro as a binary format for messages but don't want
 * to have ot use a Confluent Schema Registry instance.
 *
 * @tparam T The type of Avro message we're dealing with
 */
class AvroEmbeddedSchemaMessageSerializer[T <: SpecificRecordBase : ClassTag] extends AvroSpecificMessageSerializer[T] {

  override val serializer = (message: T) => {
    val writer  = new SpecificDatumWriter[T](message.getSchema)
    val output  = new ByteArrayOutputStream()
    val encoder = EncoderFactory.get().binaryEncoder(output, null)

    writer.write(message, encoder)
    encoder.flush()

    ByteString(output.toByteArray)
  }

  override val deserializer = new NegotiatedDeserializer[T, ByteString]() {

    def makeSchema: Schema =
      Try(classTag[T].runtimeClass.getDeclaredMethod("SCHEMA$")) match {
        case Success(schema) => schema.invoke(null).asInstanceOf[Schema]
        case Failure(_) =>
          Try(classTag[T].runtimeClass.getDeclaredField("SCHEMA$")) match {
            case Success(schema) => schema.get(null).asInstanceOf[Schema]
            case Failure(ex) =>
              throw new RuntimeException(
                s"Error fetching avro schema for class ${classTag[T].runtimeClass}",
                ex
              )
          }
      }

    override def deserialize(bytes: ByteString): T = {
      val binaryDecoder =
        DecoderFactory.get().binaryDecoder(bytes.toArray, null)
      val reader = new SpecificDatumReader[T](makeSchema)

      reader.read(null.asInstanceOf[T], binaryDecoder)
    }

  }

}
