package phoenix.betgenius.domain

import io.circe.Decoder
import io.circe.generic.extras.ConfiguredJsonCodec
import io.circe.generic.extras.semiauto._
import io.scalaland.chimney.Transformer

import phoenix.dataapi.shared

final case class SeasonName(value: String)
object SeasonName {
  implicit val decoder: Decoder[SeasonName] = deriveUnwrappedDecoder
}

final case class SeasonId(value: Int) extends BetgeniusId {
  override val prefix: String = "t"
}
object SeasonId {
  implicit val decoder: Decoder[SeasonId] = deriveUnwrappedDecoder
}

@ConfiguredJsonCodec(decodeOnly = true)
final case class Season(id: SeasonId, name: SeasonName)
object Season {
  implicit val toSharedCompetitionTransformer: Transformer[Season, shared.Competition] =
    Transformer
      .define[Season, shared.Competition]
      .withFieldComputed(_.namespacedId, _.id.namespaced)
      .withFieldComputed(_.name, _.name.value)
      .buildTransformer

}
