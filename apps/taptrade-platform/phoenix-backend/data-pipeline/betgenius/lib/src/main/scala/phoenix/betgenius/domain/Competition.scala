package phoenix.betgenius.domain
import io.circe.Decoder
import io.circe.generic.extras.ConfiguredJsonCodec
import io.circe.generic.extras.semiauto._

@ConfiguredJsonCodec(decodeOnly = true)
final case class Competition(id: CompetitionId, name: CompetitionName, region: Region)

final case class CompetitionId(value: Int)
object CompetitionId {
  implicit val decoder: Decoder[CompetitionId] = deriveUnwrappedDecoder
}

final case class CompetitionName(value: String)
object CompetitionName {
  implicit val decoder: Decoder[CompetitionName] = deriveUnwrappedDecoder
}
