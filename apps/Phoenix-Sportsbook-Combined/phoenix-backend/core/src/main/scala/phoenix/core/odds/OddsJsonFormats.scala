package phoenix.core.odds

import scala.math.BigDecimal.RoundingMode

import io.circe._

object OddsJsonFormats {

  private val decimalOddsEncoder: Encoder[Odds] =
    Encoder.encodeBigDecimal.contramap(_.value.setScale(2, RoundingMode.HALF_UP))
  private val decimalOddsDecoder: Decoder[Odds] = Decoder.decodeBigDecimal.map(Odds.apply)
  implicit val decimalOddsCodec: Codec[Odds] = Codec.from(decimalOddsDecoder, decimalOddsEncoder)

  private val formattedOddsEncoder: Encoder[Odds] = (a: Odds) =>
    Json.obj(
      "decimal" -> decimalOddsEncoder(a),
      "american" -> Json.fromString(a.toAmericanOdds.value),
      "fractional" -> Json.fromString(a.toFractionalOdds.value))
  private val formattedOddsDecoder: Decoder[Odds] = (c: HCursor) => c.downField("decimal").as(decimalOddsDecoder)
  implicit val formattedOddsCodec: Codec[Odds] = Codec.from(formattedOddsDecoder, formattedOddsEncoder)

}
