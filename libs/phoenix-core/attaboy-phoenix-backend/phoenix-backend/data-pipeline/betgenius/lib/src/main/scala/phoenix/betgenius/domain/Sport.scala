package phoenix.betgenius.domain

import io.circe.Decoder
import io.circe.generic.extras.ConfiguredJsonCodec
import io.circe.generic.extras.semiauto._

final case class SportId(value: Int) extends BetgeniusId {
  override val prefix: String = "s"
}
object SportId {
  implicit val decoder: Decoder[SportId] = deriveUnwrappedDecoder
}

@ConfiguredJsonCodec(decodeOnly = true)
final case class Sport(id: SportId, name: SportName)

final case class SportName(value: String)
object SportName {
  implicit val decoder: Decoder[SportName] = deriveUnwrappedDecoder
}
