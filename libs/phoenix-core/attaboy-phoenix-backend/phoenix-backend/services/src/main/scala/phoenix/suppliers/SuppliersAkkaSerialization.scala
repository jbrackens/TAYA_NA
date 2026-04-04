package phoenix.suppliers

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec
import org.virtuslab.ash.annotation.SerializabilityTrait
import org.virtuslab.ash.annotation.Serializer
import org.virtuslab.ash.circe.Register
import org.virtuslab.ash.circe.Registration

import phoenix.CirceAkkaSerializable
import phoenix.core.serialization.PhoenixAkkaSerialization
import phoenix.core.serialization.PhoenixCodecs
import phoenix.suppliers.oddin.CollectorBehaviors.CollectorMessage
import phoenix.suppliers.oddin.PhoenixOddinStreamConsumer.PhoenixOddinStreamMessage
import phoenix.suppliers.oddin.StronglyTypedOddinStreamConsumer.OddinStreamMessage

@SerializabilityTrait
trait SuppliersAkkaSerializable extends CirceAkkaSerializable

@Serializer(classOf[SuppliersAkkaSerializable], Register.REGISTRATION_REGEX)
object SuppliersAkkaSerialization extends PhoenixAkkaSerialization[SuppliersAkkaSerializable] with PhoenixCodecs {

  private implicit val collectorMessageCodec: Codec[CollectorMessage] = deriveCodec
  private implicit val oddinStreamMessageCodec: Codec[OddinStreamMessage] = deriveCodec
  private implicit val phoenixOddinStreamMessageCodec: Codec[PhoenixOddinStreamMessage] = deriveCodec

  override def codecEntries: Seq[Registration[_ <: SuppliersAkkaSerializable]] =
    Seq(Register[CollectorMessage], Register[OddinStreamMessage], Register[PhoenixOddinStreamMessage])
}
