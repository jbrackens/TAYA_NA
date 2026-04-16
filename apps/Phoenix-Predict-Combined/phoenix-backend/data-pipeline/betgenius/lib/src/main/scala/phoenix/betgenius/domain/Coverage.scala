package phoenix.betgenius.domain
import io.circe.Decoder
import io.circe.generic.extras.semiauto._

final case class Coverage(fixtureId: FixtureId, isBooked: Boolean, availableFeeds: Seq[Feed])
object Coverage {
  implicit val decoder: Decoder[Coverage] = deriveConfiguredDecoder[Coverage]
}

final case class Feed(isLicensed: Boolean, `type`: String)
object Feed {
  implicit val decoder: Decoder[Feed] = deriveConfiguredDecoder[Feed]
}
