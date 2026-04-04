package phoenix.betgenius.domain

import io.circe.Decoder
import io.circe.generic.extras.ConfiguredJsonCodec
import io.circe.generic.extras.semiauto._

final case class RegionName(value: String)
object RegionName {
  implicit val decoder: Decoder[RegionName] = deriveUnwrappedDecoder
}

final case class RegionId(value: Int) {
  def asSportId = SportId(value)
}
object RegionId {
  implicit val decoder: Decoder[RegionId] = deriveUnwrappedDecoder
}

@ConfiguredJsonCodec(decodeOnly = true)
final case class Region(id: RegionId, name: RegionName)
