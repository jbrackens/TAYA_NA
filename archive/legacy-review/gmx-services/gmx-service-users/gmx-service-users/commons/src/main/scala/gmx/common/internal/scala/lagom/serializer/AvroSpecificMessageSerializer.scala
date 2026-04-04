package gmx.common.internal.scala.lagom.serializer

import akka.util.ByteString
import com.lightbend.lagom.scaladsl.api.deser.MessageSerializer.{ NegotiatedDeserializer, NegotiatedSerializer }
import com.lightbend.lagom.scaladsl.api.deser.StrictMessageSerializer
import com.lightbend.lagom.scaladsl.api.transport.MessageProtocol
import org.apache.avro.specific.SpecificRecordBase

import scala.collection.immutable

/**
 * Base trait for Avro deser.
 * This saves repetition in each of the Avro serializers.
 *
 * @tparam T The type of Avro message we're dealing with
 */
trait AvroSpecificMessageSerializer[T <: SpecificRecordBase] extends StrictMessageSerializer[T] {

  // This isn't a valid MIME type, but it is the one recommended by the Avro specification
  // see https://avro.apache.org/docs/1.8.1/spec.html#HTTP+as+Transport
  // and https://issues.apache.org/jira/browse/AVRO-488
  val avroBinary: MessageProtocol = MessageProtocol(Some("avro/binary"))

  val serializer: NegotiatedSerializer[T, ByteString]
  val deserializer: NegotiatedDeserializer[T, ByteString]

  override def serializerForRequest: NegotiatedSerializer[T, ByteString] =
    serializer

  override def acceptResponseProtocols = Seq(avroBinary)

  override def deserializer(
      protocol: MessageProtocol
    ): NegotiatedDeserializer[T, ByteString] = deserializer

  override def serializerForResponse(
      acceptedMessageProtocols: immutable.Seq[MessageProtocol]
    ): NegotiatedSerializer[T, ByteString] =
    serializer

}
